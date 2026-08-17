import React, { useState } from 'react';
import { ItemEstoque, Supermercado, ProdutoCatalogo } from '../types';

export interface ProdutoEstoqueBaixoAgrupado {
  codigo: string;
  nome: string;
  marca?: string;
  categoria?: string;
  foto?: string;
  preco_custo?: number;
  preco_venda: number;
  qtdTotal: number;
  statusEstoque: 'zerado' | 'critico' | 'baixo';
  qtdSugeridaRepor: number;
  lotes: { validade: string; qtd: number; lote: string }[];
}

interface CentroNotificacoesModalProps {
  visivel: boolean;
  onFechar: () => void;
  estoque: ItemEstoque[];
  catalogoGlobal: ProdutoCatalogo[];
  supermercado: Supermercado | null;
  nomeSupermercado: string;
  limiarEstoqueMinimo: number;
  onAlterarLimiarEstoque: (novoLimiar: number) => void;
  onAbrirReposicao: (produto: {
    codigo: string;
    nome: string;
    preco_custo?: number;
    preco_venda?: number;
    foto?: string;
    marca?: string;
    categoria?: string;
  }) => void;
  onAbrirVenda: (codigo: string, validade: string, lote: string) => void;
  onDarBaixaPerda?: (codigo: string, validade: string, lote: string, qtdPerda: number, motivo?: string) => void;
  onAbrirAlertasWhatsApp: () => void;
  abaInicial?: 'estoque_baixo' | 'validade' | 'resumo';
}

export const CentroNotificacoesModal: React.FC<CentroNotificacoesModalProps> = ({
  visivel,
  onFechar,
  estoque,
  catalogoGlobal,
  nomeSupermercado,
  limiarEstoqueMinimo,
  onAlterarLimiarEstoque,
  onAbrirReposicao,
  onAbrirVenda,
  onDarBaixaPerda,
  onAbrirAlertasWhatsApp,
  abaInicial = 'estoque_baixo',
}) => {
  const [abaAtiva, setAbaAtiva] = useState<'estoque_baixo' | 'validade' | 'resumo'>(abaInicial);
  const [busca, setBusca] = useState<string>('');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'zerados' | 'criticos' | 'baixos'>('todos');
  const [copiado, setCopiado] = useState<boolean>(false);
  const [limiarInput, setLimiarInput] = useState<string>(String(limiarEstoqueMinimo));
  const [itemPerdaModal, setItemPerdaModal] = useState<ItemEstoque | null>(null);
  const [qtdPerdaInput, setQtdPerdaInput] = useState<number>(1);
  const [motivoPerdaInput, setMotivoPerdaInput] = useState<string>('Produto Vencido');
  const [msgPerda, setMsgPerda] = useState<string>('');

  // Sync limiarInput when prop changes
  React.useEffect(() => {
    setLimiarInput(String(limiarEstoqueMinimo));
  }, [limiarEstoqueMinimo]);

  // Sync abaInicial when modal opens
  React.useEffect(() => {
    if (visivel) {
      setAbaAtiva(abaInicial);
    }
  }, [visivel, abaInicial]);

  if (!visivel) return null;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  // 1. ANÁLISE DE ESTOQUE BAIXO (Agrupamento por Código EAN)
  const agrupadosPorCodigo: Record<string, {
    codigo: string;
    nome: string;
    marca?: string;
    categoria?: string;
    foto?: string;
    preco_custo?: number;
    preco_venda: number;
    qtdTotal: number;
    lotes: { validade: string; qtd: number; lote: string }[];
  }> = {};

  estoque.forEach((item) => {
    const catRel = catalogoGlobal.find((c) => c.codigo === item.codigo);
    if (!agrupadosPorCodigo[item.codigo]) {
      agrupadosPorCodigo[item.codigo] = {
        codigo: item.codigo,
        nome: item.nome || catRel?.nome || 'Produto sem nome',
        marca: catRel?.marca || '',
        categoria: catRel?.categoria || '',
        foto: item.foto || catRel?.imagem || '',
        preco_custo: item.preco_custo || 0,
        preco_venda: item.preco_venda || 0,
        qtdTotal: 0,
        lotes: [],
      };
    }
    agrupadosPorCodigo[item.codigo].qtdTotal += item.quantidade;
    agrupadosPorCodigo[item.codigo].lotes.push({
      validade: item.validade,
      qtd: item.quantidade,
      lote: item.lote,
    });
    if (item.foto && !agrupadosPorCodigo[item.codigo].foto) {
      agrupadosPorCodigo[item.codigo].foto = item.foto;
    }
    if (item.preco_venda) {
      agrupadosPorCodigo[item.codigo].preco_venda = item.preco_venda;
    }
    if (item.preco_custo) {
      agrupadosPorCodigo[item.codigo].preco_custo = item.preco_custo;
    }
  });

  // Identifica itens com estoque menor ou igual ao limiar definido pelo usuário
  const produtosEstoqueBaixo: ProdutoEstoqueBaixoAgrupado[] = Object.values(agrupadosPorCodigo)
    .filter((prod) => prod.qtdTotal <= limiarEstoqueMinimo)
    .map((prod) => {
      let statusEstoque: 'zerado' | 'critico' | 'baixo' = 'baixo';
      if (prod.qtdTotal <= 0) {
        statusEstoque = 'zerado';
      } else if (prod.qtdTotal <= Math.max(1, Math.floor(limiarEstoqueMinimo / 2))) {
        statusEstoque = 'critico';
      } else {
        statusEstoque = 'baixo';
      }

      const qtdSugeridaRepor = Math.max(limiarEstoqueMinimo * 2 - prod.qtdTotal, limiarEstoqueMinimo);

      return {
        ...prod,
        statusEstoque,
        qtdSugeridaRepor,
      };
    });

  // Ordena por menor quantidade primeiro (itens zerados e mais críticos no topo)
  produtosEstoqueBaixo.sort((a, b) => a.qtdTotal - b.qtdTotal);

  // Filtros de busca e status para Estoque Baixo
  const termoBusca = busca.trim().toLowerCase();
  const produtosBaixosFiltrados = produtosEstoqueBaixo.filter((p) => {
    const matchBusca = p.nome.toLowerCase().includes(termoBusca) || p.codigo.toLowerCase().includes(termoBusca);
    if (!matchBusca) return false;

    if (filtroStatus === 'zerados') return p.qtdTotal === 0;
    if (filtroStatus === 'criticos') return p.statusEstoque === 'critico';
    if (filtroStatus === 'baixos') return p.statusEstoque === 'baixo';
    return true;
  });

  const countZerados = produtosEstoqueBaixo.filter((p) => p.qtdTotal === 0).length;
  const countCriticos = produtosEstoqueBaixo.filter((p) => p.statusEstoque === 'critico').length;
  const countBaixos = produtosEstoqueBaixo.filter((p) => p.statusEstoque === 'baixo').length;

  // 2. ANÁLISE DE VALIDADE
  const vencidos = estoque.filter((p) => {
    const dataVal = new Date(p.validade + 'T00:00:00');
    const dias = Math.round((dataVal.getTime() - hoje.getTime()) / 86400000);
    return dias <= 0;
  });

  const proximoVencimento = estoque.filter((p) => {
    const dataVal = new Date(p.validade + 'T00:00:00');
    const dias = Math.round((dataVal.getTime() - hoje.getTime()) / 86400000);
    return dias <= 10;
  });

  // Formatar Mensagem de WhatsApp para Pedido de Reposição
  const gerarMensagemWhatsAppReposicao = () => {
    const dataFormatada = new Date().toLocaleDateString('pt-BR');
    let msg = `📦 *PEDIDO DE REPOSIÇÃO DE ESTOQUE (ESTOQUE BAIXO)* 📦\n`;
    msg += `🏪 *Loja:* ${nomeSupermercado || 'SUPERMERCADO'}\n`;
    msg += `📅 *Data da Solicitação:* ${dataFormatada}\n`;
    msg += `⚠️ *Limiar de Alerta Definido:* ≤ ${limiarEstoqueMinimo} unidades\n`;
    msg += `📊 *Total de Itens para Repor:* ${produtosEstoqueBaixo.length} produtos\n`;
    msg += `-----------------------------------\n\n`;

    if (produtosEstoqueBaixo.length === 0) {
      msg += `✅ *Excelente!* Nenhum item com estoque abaixo de ${limiarEstoqueMinimo} unidades no momento.\n`;
    } else {
      produtosEstoqueBaixo.forEach((p, idx) => {
        const statusTxt = p.qtdTotal === 0 ? '🔴 ESGOTADO (0 un)' : `⚠️ Restam apenas ${p.qtdTotal} un`;
        msg += `${idx + 1}. *${p.nome}*\n`;
        msg += `   • Cód: ${p.codigo}\n`;
        msg += `   • Estoque Atual: ${p.qtdTotal} un (${statusTxt})\n`;
        msg += `   • Pedido Sugerido: *+${p.qtdSugeridaRepor} un*\n`;
        if (p.preco_custo && p.preco_custo > 0) {
          msg += `   • Último Custo: R$ ${p.preco_custo.toFixed(2)}\n`;
        }
        msg += `\n`;
      });
    }

    msg += `-----------------------------------\n`;
    msg += `Solicitação gerada via Central de Notificações do Supermercado.`;
    return msg;
  };

  const copiarListaReposicao = () => {
    const texto = gerarMensagemWhatsAppReposicao();
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  const enviarWhatsAppReposicao = () => {
    const texto = gerarMensagemWhatsAppReposicao();
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
  };

  const aplicarNovoLimiar = (valor: number) => {
    const val = Math.max(1, Math.floor(valor));
    onAlterarLimiarEstoque(val);
    setLimiarInput(String(val));
  };

  return (
    <div className="modal" style={{ display: 'flex', zIndex: 350 }}>
      <div
        className="modal-conteudo"
        style={{
          maxWidth: '560px',
          width: '95%',
          borderRadius: '16px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
        }}
      >
        {/* CABEÇALHO DO MODAL */}
        <div
          className="cab-modal"
          style={{
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            color: '#ffffff',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.25rem' }}>🔔</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', lineHeight: 1.2 }}>Central de Notificações & Alertas</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>{nomeSupermercado}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onFechar}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              color: '#ffffff',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              fontSize: '1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* ABAS DE NAVEGAÇÃO */}
        <div
          style={{
            display: 'flex',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            padding: '4px 8px',
            gap: '4px',
          }}
        >
          <button
            type="button"
            onClick={() => setAbaAtiva('estoque_baixo')}
            style={{
              flex: 1,
              padding: '8px 10px',
              border: 'none',
              background: abaAtiva === 'estoque_baixo' ? '#ffffff' : 'transparent',
              color: abaAtiva === 'estoque_baixo' ? '#0369a1' : '#64748b',
              fontWeight: abaAtiva === 'estoque_baixo' ? 700 : 500,
              fontSize: '0.82rem',
              borderRadius: '8px',
              cursor: 'pointer',
              boxShadow: abaAtiva === 'estoque_baixo' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span>📦</span>
            <span>Estoque Baixo</span>
            <span
              style={{
                background: produtosEstoqueBaixo.length > 0 ? '#ef4444' : '#e2e8f0',
                color: produtosEstoqueBaixo.length > 0 ? '#ffffff' : '#64748b',
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: '10px',
              }}
            >
              {produtosEstoqueBaixo.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva('validade')}
            style={{
              flex: 1,
              padding: '8px 10px',
              border: 'none',
              background: abaAtiva === 'validade' ? '#ffffff' : 'transparent',
              color: abaAtiva === 'validade' ? '#d97706' : '#64748b',
              fontWeight: abaAtiva === 'validade' ? 700 : 500,
              fontSize: '0.82rem',
              borderRadius: '8px',
              cursor: 'pointer',
              boxShadow: abaAtiva === 'validade' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span>⚠️</span>
            <span>Validade</span>
            <span
              style={{
                background: proximoVencimento.length > 0 ? '#f59e0b' : '#e2e8f0',
                color: proximoVencimento.length > 0 ? '#ffffff' : '#64748b',
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: '10px',
              }}
            >
              {proximoVencimento.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva('resumo')}
            style={{
              padding: '8px 12px',
              border: 'none',
              background: abaAtiva === 'resumo' ? '#ffffff' : 'transparent',
              color: abaAtiva === 'resumo' ? '#0f172a' : '#64748b',
              fontWeight: abaAtiva === 'resumo' ? 700 : 500,
              fontSize: '0.82rem',
              borderRadius: '8px',
              cursor: 'pointer',
              boxShadow: abaAtiva === 'resumo' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
            }}
          >
            <span>📊</span>
            <span>Resumo</span>
          </button>
        </div>

        {/* CORPO DO MODAL */}
        <div className="corpo-modal" style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
          {/* ========================================================================= */}
          {/* ABA 1: ESTOQUE BAIXO & REPOSIÇÃO DEFINIDA PELO USUÁRIO                     */}
          {/* ========================================================================= */}
          {abaAtiva === 'estoque_baixo' && (
            <div>
              {/* PAINEL DE CONFIGURAÇÃO DE LIMIAR DO USUÁRIO */}
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  marginBottom: '14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '1.1rem' }}>⚙️</span>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#166534' }}>
                      Limiar de Estoque Mínimo (Ponto de Reposição)
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="number"
                      min="1"
                      max="9999"
                      value={limiarInput}
                      onChange={(e) => setLimiarInput(e.target.value)}
                      onBlur={() => {
                        const num = parseInt(limiarInput, 10);
                        if (!isNaN(num) && num > 0) {
                          aplicarNovoLimiar(num);
                        } else {
                          setLimiarInput(String(limiarEstoqueMinimo));
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const num = parseInt(limiarInput, 10);
                          if (!isNaN(num) && num > 0) {
                            aplicarNovoLimiar(num);
                          }
                        }
                      }}
                      style={{
                        width: '65px',
                        padding: '4px 8px',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        textAlign: 'center',
                        borderRadius: '6px',
                        border: '1px solid #86efac',
                        background: '#ffffff',
                        color: '#15803d',
                      }}
                      title="Digite o número de unidades mínimo para acionar alerta de reposição"
                    />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#166534' }}>unidades</span>
                  </div>
                </div>

                {/* PRESETS RÁPIDOS */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                  <span style={{ fontSize: '0.74rem', color: '#15803d', fontWeight: 600 }}>Atalhos Rápidos:</span>
                  {[2, 3, 5, 10, 15, 20].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => aplicarNovoLimiar(val)}
                      style={{
                        padding: '2px 8px',
                        fontSize: '0.72rem',
                        fontWeight: limiarEstoqueMinimo === val ? 700 : 500,
                        background: limiarEstoqueMinimo === val ? '#16a34a' : '#dcfce7',
                        color: limiarEstoqueMinimo === val ? '#ffffff' : '#15803d',
                        border: '1px solid #86efac',
                        borderRadius: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      {val} un
                    </button>
                  ))}
                </div>

                <div style={{ fontSize: '0.74rem', color: '#166534', marginTop: '6px', lineHeight: 1.3 }}>
                  💡 Destacando produtos com estoque igual ou abaixo de <b>{limiarEstoqueMinimo} unidades</b> para você solicitar reposição aos fornecedores.
                </div>
              </div>

              {/* BOTÕES DE DISPARO RÁPIDO DE PEDIDO / WHATSAPP */}
              {produtosEstoqueBaixo.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={enviarWhatsAppReposicao}
                    style={{
                      flex: 1,
                      minWidth: '180px',
                      background: '#25d366',
                      color: '#ffffff',
                      border: 'none',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 4px rgba(37,211,102,0.25)',
                    }}
                  >
                    <span>💬</span>
                    <span>Enviar Pedido no WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={copiarListaReposicao}
                    style={{
                      background: copiado ? '#15803d' : '#f1f5f9',
                      color: copiado ? '#ffffff' : '#334155',
                      border: '1px solid #cbd5e1',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>{copiado ? '✅' : '📋'}</span>
                    <span>{copiado ? 'Copiado!' : 'Copiar Lista'}</span>
                  </button>
                </div>
              )}

              {/* BARRA DE FILTRO E BUSCA */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Buscar produto para repor..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  style={{
                    flex: 1,
                    minWidth: '140px',
                    padding: '6px 10px',
                    fontSize: '0.82rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                  }}
                />

                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setFiltroStatus('todos')}
                    style={{
                      padding: '4px 8px',
                      fontSize: '0.72rem',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      background: filtroStatus === 'todos' ? '#0284c7' : '#ffffff',
                      color: filtroStatus === 'todos' ? '#ffffff' : '#475569',
                      fontWeight: filtroStatus === 'todos' ? 700 : 500,
                      cursor: 'pointer',
                    }}
                  >
                    Todos ({produtosEstoqueBaixo.length})
                  </button>
                  {countZerados > 0 && (
                    <button
                      type="button"
                      onClick={() => setFiltroStatus('zerados')}
                      style={{
                        padding: '4px 8px',
                        fontSize: '0.72rem',
                        borderRadius: '6px',
                        border: '1px solid #fca5a5',
                        background: filtroStatus === 'zerados' ? '#dc2626' : '#fef2f2',
                        color: filtroStatus === 'zerados' ? '#ffffff' : '#991b1b',
                        fontWeight: filtroStatus === 'zerados' ? 700 : 500,
                        cursor: 'pointer',
                      }}
                    >
                      Zerados ({countZerados})
                    </button>
                  )}
                  {countCriticos > 0 && (
                    <button
                      type="button"
                      onClick={() => setFiltroStatus('criticos')}
                      style={{
                        padding: '4px 8px',
                        fontSize: '0.72rem',
                        borderRadius: '6px',
                        border: '1px solid #fed7aa',
                        background: filtroStatus === 'criticos' ? '#ea580c' : '#fff7ed',
                        color: filtroStatus === 'criticos' ? '#ffffff' : '#c2410c',
                        fontWeight: filtroStatus === 'criticos' ? 700 : 500,
                        cursor: 'pointer',
                      }}
                    >
                      Críticos ({countCriticos})
                    </button>
                  )}
                </div>
              </div>

              {/* LISTA DE PRODUTOS COM ESTOQUE BAIXO */}
              {produtosBaixosFiltrados.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '28px 16px',
                    background: '#f8fafc',
                    borderRadius: '10px',
                    border: '1px dashed #cbd5e1',
                    color: '#64748b',
                  }}
                >
                  <div style={{ fontSize: '2rem', marginBottom: '6px' }}>🎉</div>
                  <b style={{ color: '#0f172a' }}>Nenhum item com estoque baixo!</b>
                  <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                    Todos os produtos cadastrados estão com estoque acima de {limiarEstoqueMinimo} unidades.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {produtosBaixosFiltrados.map((prod) => {
                    const isZerado = prod.qtdTotal === 0;
                    const isCritico = prod.statusEstoque === 'critico';

                    const corCard = isZerado ? '#fef2f2' : isCritico ? '#fff7ed' : '#fefce8';
                    const bordaCard = isZerado ? '#fca5a5' : isCritico ? '#fed7aa' : '#fef08a';
                    const corBadge = isZerado ? '#dc2626' : isCritico ? '#ea580c' : '#ca8a04';
                    const textoBadge = isZerado
                      ? '🔴 ESGOTADO (0 un)'
                      : isCritico
                      ? `🟠 CRÍTICO (${prod.qtdTotal} un)`
                      : `⚠️ BAIXO (${prod.qtdTotal} un)`;

                    return (
                      <div
                        key={prod.codigo}
                        style={{
                          background: corCard,
                          border: `1px solid ${bordaCard}`,
                          borderRadius: '10px',
                          padding: '10px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          transition: 'transform 0.15s ease',
                        }}
                      >
                        {/* FOTO DO PRODUTO */}
                        <div
                          style={{
                            width: '46px',
                            height: '46px',
                            borderRadius: '8px',
                            background: '#ffffff',
                            border: '1px solid rgba(0,0,0,0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            flexShrink: 0,
                          }}
                        >
                          {prod.foto ? (
                            <img
                              src={prod.foto}
                              alt={prod.nome}
                              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            />
                          ) : (
                            <span style={{ fontSize: '1.2rem' }}>📦</span>
                          )}
                        </div>

                        {/* DETALHES DO PRODUTO */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <b
                              style={{
                                fontSize: '0.88rem',
                                color: '#0f172a',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {prod.nome}
                            </b>
                            <span
                              style={{
                                background: corBadge,
                                color: '#ffffff',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: '4px',
                              }}
                            >
                              {textoBadge}
                            </span>
                          </div>

                          <div style={{ fontSize: '0.76rem', color: '#475569', marginTop: '2px' }}>
                            Cód: <b>{prod.codigo}</b> | Venda: <b>R$ {prod.preco_venda.toFixed(2)}</b>
                            {prod.preco_custo ? ` | Custo: R$ ${prod.preco_custo.toFixed(2)}` : ''}
                          </div>

                          {/* BARRA INDICADORA DE ESTOQUE */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                            <div
                              style={{
                                flex: 1,
                                height: '6px',
                                background: 'rgba(0,0,0,0.08)',
                                borderRadius: '3px',
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  width: `${Math.min(100, (prod.qtdTotal / limiarEstoqueMinimo) * 100)}%`,
                                  height: '100%',
                                  background: corBadge,
                                }}
                              ></div>
                            </div>
                            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#334155' }}>
                              Repor: <b>+{prod.qtdSugeridaRepor} un</b>
                            </span>
                          </div>
                        </div>

                        {/* BOTÕES DE AÇÃO */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
                          <button
                            type="button"
                            onClick={() => onAbrirReposicao(prod)}
                            style={{
                              background: '#0284c7',
                              color: '#ffffff',
                              border: 'none',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              whiteSpace: 'nowrap',
                            }}
                            title="Entrada rápida de novo lote / reposição"
                          >
                            <span>➕</span>
                            <span>Repor</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const msgItem = `📦 *PEDIDO DE REPOSIÇÃO*\n🏪 *Loja:* ${nomeSupermercado}\n📦 *Produto:* ${prod.nome}\n🔢 *Cód:* ${prod.codigo}\n📊 *Estoque Atual:* ${prod.qtdTotal} un\n🛒 *Pedido Sugerido:* +${prod.qtdSugeridaRepor} un`;
                              window.open(`https://wa.me/?text=${encodeURIComponent(msgItem)}`, '_blank');
                            }}
                            style={{
                              background: '#25d366',
                              color: '#ffffff',
                              border: 'none',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                            }}
                            title="Enviar pedido individual no WhatsApp"
                          >
                            <span>💬</span>
                            <span>Zap</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 2: ALERTAS DE VALIDADE & VENCIMENTO                                    */}
          {/* ========================================================================= */}
          {abaAtiva === 'validade' && (
            <div>
              {/* DESTAQUE WHATSAPP */}
              <div
                style={{
                  background: '#dcfce7',
                  border: '1px solid #86efac',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  marginBottom: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div>
                  <b style={{ fontSize: '0.85rem', color: '#14532d' }}>📱 Relatório Completo de Validades</b>
                  <div style={{ fontSize: '0.74rem', color: '#166534' }}>
                    Envie toda a relação de vencimentos para a equipe via WhatsApp
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onAbrirAlertasWhatsApp}
                  style={{
                    background: '#25d366',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span>💬</span>
                  <span>Abrir WhatsApp</span>
                </button>
              </div>

              {proximoVencimento.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#64748b', padding: '24px' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '6px' }}>👍</div>
                  <b>Nenhum alerta de validade nos próximos 10 dias!</b>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {proximoVencimento.map((p) => {
                    const dataVal = new Date(p.validade + 'T00:00:00');
                    const dias = Math.round((dataVal.getTime() - hoje.getTime()) / 86400000);

                    let textoStatus = '';
                    let corFundo = '#fef3c7';
                    let corTexto = '#92400e';
                    let borda = '#fde68a';

                    if (dias < 0) {
                      const diasPassados = Math.abs(dias);
                      textoStatus = `❌ Vencido há ${diasPassados} dia(s)`;
                      corFundo = '#fee2e2';
                      corTexto = '#991b1b';
                      borda = '#fca5a5';
                    } else if (dias === 0) {
                      textoStatus = '🚨 Vence HOJE';
                      corFundo = '#fee2e2';
                      corTexto = '#991b1b';
                      borda = '#fca5a5';
                    } else {
                      textoStatus = `⚠️ Vence em ${dias} dia(s)`;
                    }

                    return (
                      <div
                        key={`val_${p.codigo}_${p.validade}_${p.lote}`}
                        style={{
                          background: corFundo,
                          border: `1px solid ${borda}`,
                          padding: '10px 12px',
                          borderRadius: '8px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <b style={{ color: '#0f172a', fontSize: '0.88rem' }}>{p.nome}</b>
                          <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '2px' }}>
                            Cód: {p.codigo} | Lote: {p.lote || 'N/D'} | Qtd: <b>{p.quantidade} un</b>
                          </div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: corTexto, marginTop: '2px' }}>
                            {textoStatus} ({p.validade})
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            onClick={() => {
                              const msgItem = `🚨 *ALERTA DE VALIDADE*\n🏪 *Loja:* ${nomeSupermercado}\n📦 *Produto:* ${p.nome}\n🔢 *Cód:* ${p.codigo}\n📅 *Validade:* ${p.validade} (${textoStatus})\n📊 *Estoque:* ${p.quantidade} un`;
                              window.open(`https://wa.me/?text=${encodeURIComponent(msgItem)}`, '_blank');
                            }}
                            style={{
                              background: '#25d366',
                              color: '#ffffff',
                              border: 'none',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            💬 Zap
                          </button>

                          {dias <= 0 && onDarBaixaPerda && (
                            <button
                              type="button"
                              onClick={() => {
                                setItemPerdaModal(p);
                                setQtdPerdaInput(p.quantidade);
                                setMotivoPerdaInput('Produto Vencido');
                                setMsgPerda('');
                              }}
                              style={{
                                background: '#dc2626',
                                color: '#ffffff',
                                border: 'none',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                              title="Dar baixa de descarte / perda neste produto vencido"
                            >
                              <span>🗑️</span>
                              <span>Baixa Perda</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => onAbrirVenda(p.codigo, p.validade, p.lote || '')}
                            style={{
                              background: '#0284c7',
                              color: '#ffffff',
                              border: 'none',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Vender / Ver
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 3: PAINEL DE RESUMO GERAL DE ALERTAS                                   */}
          {/* ========================================================================= */}
          {abaAtiva === 'resumo' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '14px' }}>
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '10px',
                    padding: '12px',
                    textAlign: 'center',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    setAbaAtiva('estoque_baixo');
                    setFiltroStatus('zerados');
                  }}
                >
                  <div style={{ fontSize: '1.4rem' }}>🔴</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#991b1b' }}>{countZerados}</div>
                  <div style={{ fontSize: '0.76rem', fontWeight: 600, color: '#7f1d1d' }}>Itens Esgotados (0 un)</div>
                </div>

                <div
                  style={{
                    background: '#fff7ed',
                    border: '1px solid #fed7aa',
                    borderRadius: '10px',
                    padding: '12px',
                    textAlign: 'center',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    setAbaAtiva('estoque_baixo');
                    setFiltroStatus('todos');
                  }}
                >
                  <div style={{ fontSize: '1.4rem' }}>📦</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#c2410c' }}>{produtosEstoqueBaixo.length}</div>
                  <div style={{ fontSize: '0.76rem', fontWeight: 600, color: '#9a3412' }}>
                    Abaixo do Limiar (≤ {limiarEstoqueMinimo})
                  </div>
                </div>

                <div
                  style={{
                    background: '#fee2e2',
                    border: '1px solid #fca5a5',
                    borderRadius: '10px',
                    padding: '12px',
                    textAlign: 'center',
                    cursor: 'pointer',
                  }}
                  onClick={() => setAbaAtiva('validade')}
                >
                  <div style={{ fontSize: '1.4rem' }}>❌</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#991b1b' }}>{vencidos.length}</div>
                  <div style={{ fontSize: '0.76rem', fontWeight: 600, color: '#7f1d1d' }}>Itens Vencidos</div>
                </div>

                <div
                  style={{
                    background: '#fef3c7',
                    border: '1px solid #fde68a',
                    borderRadius: '10px',
                    padding: '12px',
                    textAlign: 'center',
                    cursor: 'pointer',
                  }}
                  onClick={() => setAbaAtiva('validade')}
                >
                  <div style={{ fontSize: '1.4rem' }}>⚠️</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#b45309' }}>{proximoVencimento.length}</div>
                  <div style={{ fontSize: '0.76rem', fontWeight: 600, color: '#78350f' }}>Vencendo em até 10 dias</div>
                </div>
              </div>

              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '12px',
                  fontSize: '0.8rem',
                  color: '#475569',
                  lineHeight: 1.4,
                }}
              >
                <b>📌 Dica do Gerente:</b>
                <p style={{ marginTop: '4px' }}>
                  Mantenha o limiar de estoque mínimo atualizado de acordo com o giro de mercadorias da sua loja. O sistema calculará sugestões de pedidos automáticas para que nenhum item fique em falta na gôndola.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* RODAPÉ DO MODAL */}
        <div
          style={{
            padding: '12px 16px',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            className="btn btn-cancelar"
            onClick={onFechar}
            style={{ width: '100%', padding: '10px', fontWeight: 600 }}
          >
            Fechar Central de Notificações
          </button>
        </div>
      </div>

      {/* DIÁLOGO / MODAL DE CONFIRMAÇÃO DE BAIXA POR PERDA / VENCIMENTO */}
      {itemPerdaModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.7)',
            zIndex: 4000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            backdropFilter: 'blur(3px)',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '14px',
              maxWidth: '420px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              overflow: 'hidden',
              animation: 'fadeIn 0.2s ease-out',
            }}
          >
            <div
              style={{
                background: '#dc2626',
                color: '#ffffff',
                padding: '14px 16px',
                fontWeight: 700,
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>🗑️</span>
              <span>Registro de Baixa por Perda</span>
            </div>

            <div style={{ padding: '16px' }}>
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fca5a5',
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '14px',
                }}
              >
                <b style={{ color: '#991b1b', fontSize: '0.92rem', display: 'block' }}>
                  {itemPerdaModal.nome}
                </b>
                <div style={{ fontSize: '0.8rem', color: '#7f1d1d', marginTop: '4px' }}>
                  <b>Cód:</b> {itemPerdaModal.codigo} | <b>Lote:</b> {itemPerdaModal.lote || 'N/D'}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#7f1d1d', marginTop: '2px' }}>
                  <b>Validade:</b> {itemPerdaModal.validade} (Vencido)
                </div>
                <div style={{ fontSize: '0.85rem', color: '#991b1b', marginTop: '4px', fontWeight: 700 }}>
                  Estoque disponível no lote: {itemPerdaModal.quantidade} un
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Quantidade para descartar / dar baixa:
                </label>
                <input
                  type="number"
                  min="1"
                  max={itemPerdaModal.quantidade}
                  value={qtdPerdaInput}
                  onChange={(e) => setQtdPerdaInput(parseInt(e.target.value, 10) || 0)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '0.95rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Motivo da Perda / Descarte:
                </label>
                <select
                  value={motivoPerdaInput}
                  onChange={(e) => setMotivoPerdaInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '0.88rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="Produto Vencido">❌ Produto Vencido (Prazo de Validade Expirado)</option>
                  <option value="Avaria / Embalagem Violada">📦 Avaria / Embalagem Violada ou Danificada</option>
                  <option value="Quebra / Degradação">💥 Quebra ou Degradação Física</option>
                  <option value="Descarte Sanitário">⚠️ Descarte Sanitário / Vigilância</option>
                </select>
              </div>

              {msgPerda && (
                <div style={{ marginBottom: '12px', fontSize: '0.85rem', fontWeight: 600, textAlign: 'center' }}>
                  {msgPerda}
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (isNaN(qtdPerdaInput) || qtdPerdaInput < 1) {
                      setMsgPerda('⚠️ Digite uma quantidade válida!');
                      return;
                    }
                    if (qtdPerdaInput > itemPerdaModal.quantidade) {
                      setMsgPerda('⚠️ Quantidade maior que o estoque no lote!');
                      return;
                    }

                    if (onDarBaixaPerda) {
                      onDarBaixaPerda(
                        itemPerdaModal.codigo,
                        itemPerdaModal.validade,
                        itemPerdaModal.lote,
                        qtdPerdaInput,
                        motivoPerdaInput
                      );
                    }

                    setMsgPerda('✅ Baixa de perda registrada com sucesso!');
                    setTimeout(() => {
                      setItemPerdaModal(null);
                      setMsgPerda('');
                    }, 700);
                  }}
                  style={{
                    flex: 1,
                    background: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                  }}
                >
                  Confirmar Baixa de Perda
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setItemPerdaModal(null);
                    setMsgPerda('');
                  }}
                  style={{
                    background: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
