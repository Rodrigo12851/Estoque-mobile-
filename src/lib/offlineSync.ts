import { Venda, ItemEstoque, ProdutoCatalogo, ClienteDevedor, SessaoCaixaTurno, LogAuditoria } from '../types';
import {
  salvarVendaFirestore,
  salvarItemEstoqueFirestore,
  excluirItemEstoqueFirestore,
  salvarProdutoCatalogoFirestore,
  salvarClienteDevedorFirestore,
  sanitizarIdDoc,
} from './firestoreSync';
import { db } from './firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';

export type PrioridadeSincronizacao = 1 | 2 | 3; // 1 = CRÍTICA (Estoque & Vendas), 2 = MÉDIA (Caixa & Fiado), 3 = BAIXA (Catálogo & Auditoria)

export type TipoOperacaoFila =
  | 'VENDA'
  | 'ESTOQUE_UPDATE'
  | 'ESTOQUE_DELETE'
  | 'DEVEDOR_UPDATE'
  | 'CAIXA_SESSAO'
  | 'CATALOGO_UPDATE'
  | 'LOG_AUDITORIA';

export interface ItemFilaOffline {
  id: string;
  prioridade: PrioridadeSincronizacao;
  tipoOperacao: TipoOperacaoFila;
  lojaId: string;
  timestamp: number;
  tentativas: number;
  payload: any;
  descricao?: string;
  versaoLocal?: number;
  ultimoErro?: string;
}

const CHAVE_FILA_OFFLINE_PRIORITARIA = 'fila_sincronizacao_offline_v2';
const CHAVE_LEGADA_VENDAS = 'vendas_pendentes_sync_offline';

/**
 * Obtém todos os itens pendentes na fila offline ordenados por prioridade (1 antes de 2 e 3)
 */
export function obterFilaOfflinePrioritaria(): ItemFilaOffline[] {
  try {
    const salvo = localStorage.getItem(CHAVE_FILA_OFFLINE_PRIORITARIA);
    let fila: ItemFilaOffline[] = salvo ? JSON.parse(salvo) : [];

    // Migração de vendas da fila legada se existirem
    const legadas = localStorage.getItem(CHAVE_LEGADA_VENDAS);
    if (legadas) {
      try {
        const vendasLegadas: Venda[] = JSON.parse(legadas);
        if (vendasLegadas.length > 0) {
          vendasLegadas.forEach((v) => {
            if (!fila.some((it) => it.tipoOperacao === 'VENDA' && it.payload?.id === v.id)) {
              fila.push({
                id: 'mig_' + v.id,
                prioridade: 1, // Venda é Prioridade 1 (Crítica)
                tipoOperacao: 'VENDA',
                lojaId: v.lojaId,
                timestamp: v.timestamp || Date.now(),
                tentativas: 0,
                payload: v,
                descricao: `Venda ${v.id} (R$ ${v.valorTotal?.toFixed(2)})`,
              });
            }
          });
          localStorage.removeItem(CHAVE_LEGADA_VENDAS);
          localStorage.setItem(CHAVE_FILA_OFFLINE_PRIORITARIA, JSON.stringify(fila));
        }
      } catch (e) {
        console.warn('Erro ao migrar vendas da fila legada:', e);
      }
    }

    // Ordenar estritamente: Prioridade 1 primeiro, depois por timestamp (FIFO dentro da prioridade)
    return fila.sort((a, b) => {
      if (a.prioridade !== b.prioridade) {
        return a.prioridade - b.prioridade;
      }
      return (a.timestamp || 0) - (b.timestamp || 0);
    });
  } catch (e) {
    console.error('Erro ao ler fila offline prioritária:', e);
    return [];
  }
}

/**
 * Adiciona um item à fila prioritária offline garantindo minimização de conflitos
 */
export function adicionarItemFilaOffline(
  tipoOperacao: TipoOperacaoFila,
  payload: any,
  lojaId: string,
  prioridade?: PrioridadeSincronizacao,
  descricao?: string
): ItemFilaOffline {
  // Atribuir prioridade automática caso não informada
  let prioFinal: PrioridadeSincronizacao = prioridade || 2;
  if (!prioridade) {
    if (tipoOperacao === 'VENDA' || tipoOperacao === 'ESTOQUE_UPDATE' || tipoOperacao === 'ESTOQUE_DELETE') {
      prioFinal = 1; // Prioridade Máxima para estoque e vendas
    } else if (tipoOperacao === 'DEVEDOR_UPDATE' || tipoOperacao === 'CAIXA_SESSAO') {
      prioFinal = 2; // Média para financeiro/fiado/caixa
    } else {
      prioFinal = 3; // Baixa para catálogo e auditoria
    }
  }

  const fila = obterFilaOfflinePrioritaria();

  // Deduplicação inteligente de estoque: se já houver uma atualização pendente para o mesmo produto/lote,
  // substituir pelo estado mais recente para economizar dados e evitar conflitos de versão
  let novaFila = [...fila];
  if (tipoOperacao === 'ESTOQUE_UPDATE' && payload?.codigo && payload?.validade) {
    novaFila = novaFila.filter(
      (it) =>
        !(
          it.tipoOperacao === 'ESTOQUE_UPDATE' &&
          it.lojaId === lojaId &&
          it.payload?.codigo === payload.codigo &&
          it.payload?.validade === payload.validade &&
          it.payload?.lote === payload.lote
        )
    );
  }

  const novoItem: ItemFilaOffline = {
    id: 'sync_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    prioridade: prioFinal,
    tipoOperacao,
    lojaId: lojaId || 'loja_padrao',
    timestamp: Date.now(),
    tentativas: 0,
    payload,
    descricao: descricao || `${tipoOperacao} (${new Date().toLocaleTimeString('pt-BR')})`,
    versaoLocal: Date.now(),
  };

  novaFila.push(novoItem);
  localStorage.setItem(CHAVE_FILA_OFFLINE_PRIORITARIA, JSON.stringify(novaFila));

  return novoItem;
}

/**
 * Função de conveniência compatível para adicionar vendas à fila
 */
export function adicionarVendaFilaOffline(venda: Venda) {
  adicionarItemFilaOffline(
    'VENDA',
    venda,
    venda.lojaId,
    1, // Prioridade 1 = CRÍTICA
    `Venda ${venda.id} - R$ ${venda.valorTotal?.toFixed(2)}`
  );
}

/**
 * Retorna as vendas pendentes para compatibilidade com interfaces existentes
 */
export function obterVendasPendentesOffline(): Venda[] {
  const fila = obterFilaOfflinePrioritaria();
  return fila.filter((it) => it.tipoOperacao === 'VENDA').map((it) => it.payload as Venda);
}

/**
 * Estatísticas detalhadas da fila de sincronização
 */
export function obterEstatisticasFilaOffline(): {
  total: number;
  criticos: number; // Prioridade 1 (Estoque / Vendas)
  medios: number; // Prioridade 2 (Fiado / Caixa)
  baixos: number; // Prioridade 3 (Catálogo / Logs)
  vendasCount: number;
  estoqueCount: number;
} {
  const fila = obterFilaOfflinePrioritaria();
  return {
    total: fila.length,
    criticos: fila.filter((it) => it.prioridade === 1).length,
    medios: fila.filter((it) => it.prioridade === 2).length,
    baixos: fila.filter((it) => it.prioridade === 3).length,
    vendasCount: fila.filter((it) => it.tipoOperacao === 'VENDA').length,
    estoqueCount: fila.filter((it) => it.tipoOperacao === 'ESTOQUE_UPDATE' || it.tipoOperacao === 'ESTOQUE_DELETE').length,
  };
}

let isSincronizando = false;

/**
 * Processador de Fila Prioritária
 * Sincroniza os registros críticos imediatamente após a reconexão
 */
export async function sincronizarFilaOfflinePrioritaria(): Promise<{
  sincronizados: number;
  erros: number;
  restantes: number;
}> {
  if (!navigator.onLine || isSincronizando) {
    return { sincronizados: 0, erros: 0, restantes: obterFilaOfflinePrioritaria().length };
  }

  isSincronizando = true;
  const fila = obterFilaOfflinePrioritaria();

  if (fila.length === 0) {
    isSincronizando = false;
    return { sincronizados: 0, erros: 0, restantes: 0 };
  }

  let sincronizados = 0;
  let erros = 0;
  const restantes: ItemFilaOffline[] = [];

  for (const item of fila) {
    try {
      switch (item.tipoOperacao) {
        case 'VENDA': {
          await salvarVendaFirestore(item.payload as Venda);
          break;
        }

        case 'ESTOQUE_UPDATE': {
          await salvarItemEstoqueFirestore(item.payload as ItemEstoque, item.lojaId);
          break;
        }

        case 'ESTOQUE_DELETE': {
          const { codigo, validade, lote } = item.payload;
          await excluirItemEstoqueFirestore(codigo, validade, lote, item.lojaId);
          break;
        }

        case 'DEVEDOR_UPDATE': {
          await salvarClienteDevedorFirestore(item.payload as ClienteDevedor);
          break;
        }

        case 'CATALOGO_UPDATE': {
          await salvarProdutoCatalogoFirestore(item.payload as ProdutoCatalogo);
          break;
        }

        case 'CAIXA_SESSAO': {
          const sessao = item.payload as SessaoCaixaTurno;
          const safeId = sanitizarIdDoc(sessao.id);
          await setDoc(doc(db, 'sessoes_caixa', safeId), JSON.parse(JSON.stringify(sessao)), { merge: true });
          break;
        }

        case 'LOG_AUDITORIA': {
          const logItem = item.payload as LogAuditoria;
          const safeId = sanitizarIdDoc(logItem.id);
          await setDoc(doc(db, 'logs_auditoria', safeId), JSON.parse(JSON.stringify(logItem)), { merge: true });
          break;
        }

        default:
          console.warn('Tipo de operação desconhecido na fila:', item.tipoOperacao);
      }

      sincronizados++;
    } catch (err: any) {
      console.error(`Erro ao sincronizar item prioritário (${item.tipoOperacao}):`, err);
      erros++;
      item.tentativas = (item.tentativas || 0) + 1;
      item.ultimoErro = err?.message || 'Falha de rede/permissão';

      // Se falhou mais de 15 vezes, ainda mantemos na fila para evitar perda de venda
      restantes.push(item);
    }
  }

  localStorage.setItem(CHAVE_FILA_OFFLINE_PRIORITARIA, JSON.stringify(restantes));
  isSincronizando = false;

  return {
    sincronizados,
    erros,
    restantes: restantes.length,
  };
}

/**
 * Função compatível com a chamada legada
 */
export async function sincronizarVendasPendentesFirestore(): Promise<number> {
  const res = await sincronizarFilaOfflinePrioritaria();
  return res.sincronizados;
}
