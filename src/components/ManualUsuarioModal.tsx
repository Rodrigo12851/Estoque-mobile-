import React, { useState } from 'react';
import { PermissoesOperador, SessaoUsuario } from '../types';

interface ManualUsuarioModalProps {
  visivel: boolean;
  onFechar: () => void;
  sessao: SessaoUsuario | null;
  permissoesOperador?: PermissoesOperador;
}

interface TopicoManual {
  id: string;
  icone: string;
  titulo: string;
  categoria: string;
  conteudo: React.ReactNode;
}

export const ManualUsuarioModal: React.FC<ManualUsuarioModalProps> = ({
  visivel,
  onFechar,
  sessao,
  permissoesOperador,
}) => {
  const [termoBusca, setTermoBusca] = useState('');
  const [topicoSelecionadoId, setTopicoSelecionadoId] = useState<string>('');

  if (!visivel) return null;

  const isDono = sessao?.tipo === 'dona_app';
  const isAdminLoja = sessao?.tipo === 'admin_loja';
  const isCaixa = sessao?.tipo === 'caixa' || (!isDono && !isAdminLoja);

  // Construir a lista de tópicos rigorosamente restrita pelo nível de acesso do usuário
  const topicos: TopicoManual[] = [];

  // ==========================================
  // SEÇÃO: TÓPICOS OPERACIONAIS (CAIXA / PDV)
  // ==========================================
  topicos.push({
    id: 'pdv_vendas',
    icone: '🛒',
    titulo: 'Como Registrar Vendas no PDV',
    categoria: 'Frente de Caixa (PDV)',
    conteudo: (
      <div>
        <h4>Registro Rápido de Produtos na Frente de Caixa</h4>
        <p>A tela de vendas do PDV foi projetada para alta produtividade e rapidez no atendimento:</p>
        <ol style={{ paddingLeft: '20px', lineHeight: 1.6 }}>
          <li><strong>Leitor de Código de Barras:</strong> Posicione o cursor no campo de código de barras ou use um leitor USB/Bluetooth para bipar o produto. O item entra instantaneamente no carrinho.</li>
          <li><strong>Pesquisa por Nome / Descrição:</strong> Se o código estiver ilegível, clique no botão de busca por nome para localizar o produto no estoque.</li>
          <li><strong>Produtos de Balança (Pesáveis / KG):</strong> O leitor identifica automaticamente as etiquetas geradas pelas balanças com peso e preço embutidos no padrão EAN-13.</li>
          <li><strong>Quantidade:</strong> Para multiplicar quantidades (ex: 5 caixas de leite), digite a quantidade desejada antes ou ajuste a quantidade no item listado.</li>
        </ol>
      </div>
    ),
  });

  topicos.push({
    id: 'finalizar_pagamento',
    icone: '💳',
    titulo: 'Formas de Pagamento & Cálculo de Troco',
    categoria: 'Frente de Caixa (PDV)',
    conteudo: (
      <div>
        <h4>Finalização de Vendas e Formas de Pagamento</h4>
        <p>Após bipar todos os itens da compra:</p>
        <ul style={{ paddingLeft: '20px', lineHeight: 1.6 }}>
          <li><strong>Dinheiro em Espécie:</strong> Selecione "Dinheiro" e digite a quantia entregue pelo cliente. O sistema calcula automaticamente o troco exato a ser devolvido.</li>
          <li><strong>PIX Instantâneo:</strong> Ao escolher PIX, a tela exibe o valor exato a ser recebido. Aguarde a confirmação no terminal antes de concluir.</li>
          <li><strong>Cartão de Crédito ou Débito:</strong> Selecione a opção e passe o valor na maquininha física da sua loja.</li>
          <li><strong>Impressão de Comprovante:</strong> Ao concluir a venda, o cupom fiscal/recibo é gerado automaticamente para impressão térmica ou envio digital.</li>
        </ul>
      </div>
    ),
  });

  // Tópico de Caixa (Apenas se tiver permissão de caixa ou for admin)
  if (!isCaixa || permissoesOperador?.gestao_caixa !== false) {
    topicos.push({
      id: 'abertura_fechamento_caixa',
      icone: '💵',
      titulo: 'Abertura, Sangria e Fechamento de Caixa',
      categoria: 'Frente de Caixa (PDV)',
      conteudo: (
        <div>
          <h4>Controle Rigoroso do Turno de Caixa</h4>
          <p>Para garantir a segurança financeira da sua estação de trabalho:</p>
          <ul style={{ paddingLeft: '20px', lineHeight: 1.6 }}>
            <li><strong>Abertura de Turno:</strong> Informe seu login e senha e digite a quantia exata do <em>Fundo de Troco Inicial</em> que está fisicamente na gaveta.</li>
            <li><strong>Sangria (Retirada de Segurança):</strong> Quando o volume de dinheiro na gaveta estiver alto, faça um lançamento de Sangria para transferir as notas para o cofre da gerência.</li>
            <li><strong>Suprimento:</strong> Utilize para registrar entradas extras de moedas ou notas de troco fornecidas pela gerência.</li>
            <li><strong>Fechamento de Turno (Conferência Cega):</strong> No final do expediente, conte todo o dinheiro, cartões e PIX e digite os valores conferidos. O sistema calcula o saldo do seu turno isolado.</li>
          </ul>
        </div>
      ),
    });
  }

  // Fiado (Apenas se tiver permissão ou for admin)
  if (!isCaixa || permissoesOperador?.gerenciar_devedores !== false) {
    topicos.push({
      id: 'caderneta_fiado',
      icone: '📖',
      titulo: 'Consulta de Fiado e Baixa de Pagamentos',
      categoria: 'Operações Autorizadas',
      conteudo: (
        <div>
          <h4>Caderneta Digital de Clientes Fiado</h4>
          <p>Como consultar clientes cadastrados e registrar pagamentos de dívidas:</p>
          <ul style={{ paddingLeft: '20px', lineHeight: 1.6 }}>
            <li><strong>Venda no Fiado:</strong> Ao finalizar a compra, selecione "Fiado", localize o cliente cadastrado e confirme a dívida na conta dele.</li>
            <li><strong>Recebimento de Pagamento:</strong> Abra o módulo de Clientes Devedores, selecione o cliente e clique em "Registrar Pagamento" (integral ou parcial). O saldo devedor é recalculado na hora.</li>
            <li><strong>Limite de Crédito:</strong> Clientes com limite estourado exigem autorização expressa do gerente da loja.</li>
          </ul>
        </div>
      ),
    });
  }

  // Etiquetas (Apenas se tiver permissão ou for admin)
  if (!isCaixa || permissoesOperador?.imprimir_etiquetas !== false) {
    topicos.push({
      id: 'etiquetas_gondola',
      icone: '🏷️',
      titulo: 'Impressão de Etiquetas de Gôndola',
      categoria: 'Operações Autorizadas',
      conteudo: (
        <div>
          <h4>Gerador e Impressão de Etiquetas de Preço</h4>
          <p>Para manter as gôndolas e prateleiras devidamente identificadas:</p>
          <ul style={{ paddingLeft: '20px', lineHeight: 1.6 }}>
            <li>Abra o módulo <strong>🏷️ Etiquetas</strong> no menu superior.</li>
            <li>Selecione os produtos desejados ou filtre por categoria/corredor.</li>
            <li>Escolha o modelo de etiqueta (Pequena, Média ou Grande com Código de Barras).</li>
            <li>Clique em Imprimir para enviar para sua impressora térmica ou folha A4 adesiva.</li>
          </ul>
        </div>
      ),
    });
  }

  // Modo Offline (Para todos os operadores e admins)
  topicos.push({
    id: 'modo_offline',
    icone: '📶',
    titulo: 'Modo Offline & Fila Prioritária de Sincronização',
    categoria: 'Conexão & Segurança',
    conteudo: (
      <div>
        <h4>O que fazer quando a internet cai no supermercado?</h4>
        <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '8px', border: '1px solid #bbf7d0', marginBottom: '12px', color: '#166534' }}>
          ✅ <strong>O Supermercado Não Para:</strong> O sistema possui um motor autônomo que permite continuar vendendo e dando baixa no estoque mesmo totalmente sem internet!
        </div>
        <p>Entenda a Fila Prioritária:</p>
        <ol style={{ paddingLeft: '20px', lineHeight: 1.6 }}>
          <li><strong>Prioridade 1 (Crítica - Vendas e Baixas de Estoque):</strong> Ficam armazenadas localmente no seu computador e são enviadas imediatamente ao Firestore no exato segundo em que o sinal de rede retornar.</li>
          <li><strong>Prioridade 2 (Média - Caixa e Fiado):</strong> Sincronizados logo em seguida para manter o fluxo financeiro auditado.</li>
          <li><strong>Prioridade 3 (Normal - Catálogos e Logs):</strong> Sincronizados em segundo plano para não sobrecarregar a banda do caixa.</li>
        </ol>
      </div>
    ),
  });

  // ==========================================
  // SEÇÃO: TÓPICOS ADMINISTRATIVOS DA LOJA
  // (Exibidos APENAS para Administradores da Loja e Dono do App)
  // ==========================================
  if (isAdminLoja || isDono) {
    topicos.push({
      id: 'gestao_equipe',
      icone: '👥',
      titulo: 'Cadastro de Operadores e Controle de Permissões Granulares',
      categoria: 'Gestão da Loja (Admin)',
      conteudo: (
        <div>
          <h4>Administração da Equipe de Caixas e Supervisores</h4>
          <p>Como administrador do supermercado, você controla o que cada funcionário pode fazer:</p>
          <ul style={{ paddingLeft: '20px', lineHeight: 1.6 }}>
            <li><strong>Cadastrar Novo Operador:</strong> Acesse "👥 Operadores / Equipe", informe Nome, CPF/Login e defina uma Senha/PIN de 4 dígitos.</li>
            <li><strong>Definição Granular de Permissões:</strong> Escolha individualmente se o operador pode: aplicar descontos no PDV, gerenciar abertura/fechamento de caixa, dar baixa em perdas, acessar clientes devedores ou imprimir etiquetas.</li>
            <li><strong>Bloqueio Imediato:</strong> Ao desativar um operador, o acesso dele ao sistema é cancelado instantaneamente em todos os caixas.</li>
          </ul>
        </div>
      ),
    });

    topicos.push({
      id: 'estoque_validade',
      icone: '📦',
      titulo: 'Controle de Lotes, Validade e Baixa de Perdas/Avarias',
      categoria: 'Gestão da Loja (Admin)',
      conteudo: (
        <div>
          <h4>Controle Completo do Estoque da sua Loja</h4>
          <ul style={{ paddingLeft: '20px', lineHeight: 1.6 }}>
            <li><strong>Entrada de Estoque:</strong> Cadastre lotes e datas de validade para cada produto recebido dos fornecedores.</li>
            <li><strong>Alertas de Produtos Próximos do Vencimento:</strong> O sistema destaca produtos vencendo nos próximos 15, 30 e 60 dias para que você faça promoções e evite prejuízos.</li>
            <li><strong>Baixa de Avarias / Vencidos:</strong> Lance o descarte com o motivo oficial (Ex: "Vencido", "Embalagem Danificada"). O item sai do estoque e entra no relatório de perdas.</li>
          </ul>
        </div>
      ),
    });

    topicos.push({
      id: 'relatorios_vendas',
      icone: '📊',
      titulo: 'Relatórios de Vendas, Faturamento e Lucratividade',
      categoria: 'Gestão da Loja (Admin)',
      conteudo: (
        <div>
          <h4>Análise Financeira e Estatísticas da Loja</h4>
          <ul style={{ paddingLeft: '20px', lineHeight: 1.6 }}>
            <li><strong>Relatório Geral de Vendas:</strong> Filtre por período (Hoje, 7 dias, Mês ou Personalizado), por operador ou por forma de pagamento (Dinheiro, Cartão, PIX, Fiado).</li>
            <li><strong>Exportação:</strong> Exporte os dados fiscais e gerenciais em PDF ou planilha Excel com um clique.</li>
            <li><strong>Estorno de Vendas:</strong> Exclusivo para administradores e supervisores autorizados. Todo cancelamento gera um log permanente de auditoria.</li>
          </ul>
        </div>
      ),
    });

    topicos.push({
      id: 'whatsapp_alertas',
      icone: '📲',
      titulo: 'Disparo de Alertas e Promoções via WhatsApp',
      categoria: 'Gestão da Loja (Admin)',
      conteudo: (
        <div>
          <h4>Comunicação Direta com Clientes</h4>
          <p>Envie lembretes de cobrança de fiado amigáveis ou ofertas relâmpago de produtos com validade próxima diretamente para o WhatsApp dos clientes cadastrados.</p>
        </div>
      ),
    });
  }

  // ==========================================
  // SEÇÃO: TÓPICOS MASTER (DONO DO APLICATIVO)
  // (Exibidos EXCLUSIVAMENTE para a Dona do App)
  // ==========================================
  if (isDono) {
    topicos.push({
      id: 'multi_supermercados',
      icone: '👑',
      titulo: 'Licenciamento Multi-Lojas e Bloqueio de Supermercados',
      categoria: 'Área Master (Proprietária)',
      conteudo: (
        <div>
          <h4>Gestão Geral de Redes e Filiais Licenciadas</h4>
          <ul style={{ paddingLeft: '20px', lineHeight: 1.6 }}>
            <li><strong>Cadastrar Novo Supermercado:</strong> Crie novas contas de lojas parceiras definindo CNPJ, limites de caixas e senha administrativa inicial.</li>
            <li><strong>Bloqueio Administrativo:</strong> Suspenda o acesso de qualquer supermercado inadimplente. O bloqueio propaga em tempo real impedindo acessos de todos os funcionários e administradores daquela loja.</li>
            <li><strong>Catálogo Global Master:</strong> Cadastre produtos globais com fotos e códigos de barra padronizados que ficam disponíveis para todas as lojas da rede.</li>
            <li><strong>Alteração de Credenciais Master:</strong> Altere seu login e senha de dona do app a qualquer momento com total segurança.</li>
          </ul>
        </div>
      ),
    });
  }

  // Filtrar tópicos pelo termo de busca
  const topicosFiltrados = topicos.filter(
    (t) =>
      t.titulo.toLowerCase().includes(termoBusca.toLowerCase()) ||
      t.categoria.toLowerCase().includes(termoBusca.toLowerCase())
  );

  const topicoAtivo =
    topicos.find((t) => t.id === topicoSelecionadoId) || (topicosFiltrados.length > 0 ? topicosFiltrados[0] : null);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(6px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          width: '100%',
          maxWidth: '900px',
          height: '88vh',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
          border: '1px solid #cbd5e1',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* CABEÇALHO DO MANUAL */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            padding: '18px 24px',
            color: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.8rem' }}>📘</span>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>
                Manual Interativo de Instruções & Treinamento
              </h2>
              <p style={{ fontSize: '0.8rem', margin: '2px 0 0 0', opacity: 0.9 }}>
                Guia personalizado para seu nível de acesso: <strong>{isDono ? '👑 Dono do App' : isAdminLoja ? '🏢 Administrador da Loja' : '🛒 Operador de Caixa'}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onFechar}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: '#fff',
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              cursor: 'pointer',
              fontSize: '1.1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Fechar Manual"
          >
            ✕
          </button>
        </div>

        {/* CORPO DO MANUAL: BARRA LATERAL + CONTEÚDO */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* BARRA LATERAL DE TÓPICOS */}
          <div
            style={{
              width: '320px',
              borderRight: '1px solid #e2e8f0',
              background: '#f8fafc',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>
              <input
                type="text"
                placeholder="🔍 Pesquisar no manual..."
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ overflowY: 'auto', flex: 1, padding: '8px' }}>
              {topicosFiltrados.map((topico) => {
                const ativo = (topicoAtivo?.id === topico.id);
                return (
                  <button
                    key={topico.id}
                    onClick={() => setTopicoSelecionadoId(topico.id)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: ativo ? '#0284c7' : 'transparent',
                      color: ativo ? '#ffffff' : '#334155',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      marginBottom: '4px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span style={{ fontSize: '1.1rem' }}>{topico.icone}</span>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, lineHeight: 1.3 }}>
                        {topico.titulo}
                      </div>
                      <div style={{ fontSize: '0.72rem', opacity: ativo ? 0.9 : 0.6, marginTop: '2px' }}>
                        {topico.categoria}
                      </div>
                    </div>
                  </button>
                );
              })}

              {topicosFiltrados.length === 0 && (
                <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                  Nenhuma instrução encontrada para sua busca.
                </div>
              )}
            </div>
          </div>

          {/* ÁREA DE LEITURA DO TÓPICO */}
          <div
            style={{
              flex: 1,
              padding: '24px 30px',
              overflowY: 'auto',
              background: '#ffffff',
              fontSize: '0.92rem',
              color: '#334155',
              lineHeight: 1.65,
            }}
          >
            {topicoAtivo ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', borderBottom: '2px solid #f1f5f9', paddingBottom: '12px' }}>
                  <span style={{ fontSize: '2rem' }}>{topicoAtivo.icone}</span>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: '#0284c7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {topicoAtivo.categoria}
                    </span>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '2px 0 0 0' }}>
                      {topicoAtivo.titulo}
                    </h2>
                  </div>
                </div>

                <div className="manual-conteudo-artigo">
                  {topicoAtivo.conteudo}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                Selecione um tópico na barra lateral para ler as instruções.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
