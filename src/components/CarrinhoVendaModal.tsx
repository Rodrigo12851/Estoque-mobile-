import React, { useState } from 'react';
import { ItemCarrinho, ClienteDevedor, ItemEstoque } from '../types';

function formatarData(dataStr?: string): string {
  if (!dataStr) return '--/--/----';
  try {
    const partes = dataStr.split('-');
    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    const d = new Date(dataStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('pt-BR');
    }
  } catch {
    // fallback
  }
  return dataStr;
}

interface CarrinhoVendaModalProps {
  visivel: boolean;
  onFechar: () => void;
  carrinho: ItemCarrinho[];
  onAlterarQuantidade: (id: string, novaQtd: number) => void;
  onRemoverItem: (id: string) => void;
  onLimparCarrinho: () => void;
  onAdicionarOutroProduto: () => void;
  onFinalizarVenda: (
    formaPagamento: 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'pix' | 'fiado',
    clienteFiadoId?: string
  ) => void;
  estoqueDisponivel: ItemEstoque[];
  onAdicionarItemRapido: (item: ItemEstoque) => void;
  clientesDevedores: ClienteDevedor[];
  onAbrirCadastroCliente?: () => void;
  sessaoCaixaAberta: boolean;
  onAbrirCaixaModal?: () => void;
  obterFotoProduto: (codigo: string, foto?: string) => string;
}

export const CarrinhoVendaModal: React.FC<CarrinhoVendaModalProps> = ({
  visivel,
  onFechar,
  carrinho,
  onAlterarQuantidade,
  onRemoverItem,
  onLimparCarrinho,
  onAdicionarOutroProduto,
  onFinalizarVenda,
  estoqueDisponivel,
  onAdicionarItemRapido,
  clientesDevedores,
  onAbrirCadastroCliente,
  sessaoCaixaAberta,
  onAbrirCaixaModal,
  obterFotoProduto,
}) => {
  const [formaPagamento, setFormaPagamento] = useState<'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'pix' | 'fiado'>('pix');
  const [clienteFiadoId, setClienteFiadoId] = useState<string>('');
  const [buscaRapida, setBuscaRapida] = useState<string>('');
  const [processando, setProcessando] = useState<boolean>(false);
  const [erroMsg, setErroMsg] = useState<string>('');

  if (!visivel) return null;

  const totalGeral = carrinho.reduce((acc, item) => acc + item.subtotal, 0);
  const totalItensQtd = carrinho.reduce((acc, item) => acc + item.quantidade, 0);

  // Sugestões rápidas de produtos para adicionar ao carrinho
  const produtosFiltrados = buscaRapida.trim()
    ? estoqueDisponivel.filter((p) => {
        const termo = buscaRapida.toLowerCase();
        return (
          p.nome.toLowerCase().includes(termo) ||
          p.codigo.toLowerCase().includes(termo) ||
          (p.marca && p.marca.toLowerCase().includes(termo)) ||
          (p.categoria && p.categoria.toLowerCase().includes(termo))
        );
      }).slice(0, 8)
    : [];

  const handleConfirmar = (e: React.FormEvent) => {
    e.preventDefault();
    setErroMsg('');

    if (carrinho.length === 0) {
      setErroMsg('O carrinho está vazio! Adicione pelo menos um produto.');
      return;
    }

    if (!sessaoCaixaAberta) {
      setErroMsg('⚠️ Caixa Fechado! É necessário abrir o caixa antes de realizar vendas.');
      if (onAbrirCaixaModal) onAbrirCaixaModal();
      return;
    }

    if (formaPagamento === 'fiado') {
      if (!clienteFiadoId) {
        setErroMsg('Selecione um cliente cadastrado para registrar a compra em fiado.');
        return;
      }
      const cli = clientesDevedores.find((c) => c.id === clienteFiadoId);
      if (cli && cli.limiteFiado && cli.limiteFiado > 0) {
        if (cli.saldoDevedorTotal + totalGeral > cli.limiteFiado) {
          const confirma = window.confirm(
            `⚠️ ATENÇÃO: O total desta compra (R$ ${totalGeral.toFixed(2)}) ultrapassa o limite de fiado do cliente ${cli.nome} (R$ ${cli.limiteFiado.toFixed(2)}).\n\nSaldo atual: R$ ${cli.saldoDevedorTotal.toFixed(2)}\nDeseja continuar mesmo assim?`
          );
          if (!confirma) return;
        }
      }
    }

    setProcessando(true);
    try {
      onFinalizarVenda(formaPagamento, formaPagamento === 'fiado' ? clienteFiadoId : undefined);
    } finally {
      setProcessando(false);
    }
  };

  return (
    <div
      className="modal"
      style={{
        display: 'flex',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.75)',
        zIndex: 2500,
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px',
        backdropFilter: 'blur(3px)',
      }}
    >
      <div
        className="modal-conteudo"
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 45px rgba(0,0,0,0.3)',
          overflow: 'hidden',
        }}
      >
        {/* CABEÇALHO DO CARRINHO */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            color: '#ffffff',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.4rem' }}>🛒</span>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, letterSpacing: '-0.3px' }}>
                Carrinho de Vendas / Múltiplos Itens
              </h2>
              <p style={{ fontSize: '0.78rem', color: '#e0f2fe', margin: 0 }}>
                Dê baixa em vários produtos de uma só vez para o mesmo cliente
              </p>
            </div>
          </div>
          <button
            onClick={onFechar}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              color: '#ffffff',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* CORPO DO MODAL (ROLAGEM) */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
          {/* BUSCA RÁPIDA PARA ADICIONAR MAIS PRODUTOS */}
          <div
            style={{
              background: '#f8fafc',
              border: '1.5px dashed #cbd5e1',
              borderRadius: '12px',
              padding: '12px 14px',
              marginBottom: '16px',
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#334155',
                marginBottom: '6px',
              }}
            >
              <span>🔍</span>
              <span>Adicionar outro item ao carrinho:</span>
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Digite o nome, código de barras ou marca..."
                value={buscaRapida}
                onChange={(e) => setBuscaRapida(e.target.value)}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.88rem',
                  outline: 'none',
                }}
              />
              {buscaRapida && (
                <button
                  type="button"
                  onClick={() => setBuscaRapida('')}
                  style={{
                    background: '#e2e8f0',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0 12px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Limpar
                </button>
              )}
            </div>

            {/* LISTA DE SUGESTÕES RÁPIDAS ENCONTRADAS */}
            {buscaRapida.trim() !== '' && (
              <div
                style={{
                  marginTop: '8px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  maxHeight: '180px',
                  overflowY: 'auto',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                }}
              >
                {produtosFiltrados.length === 0 ? (
                  <div style={{ padding: '10px', fontSize: '0.82rem', color: '#64748b', textAlign: 'center' }}>
                    Nenhum produto encontrado com "{buscaRapida}".
                  </div>
                ) : (
                  produtosFiltrados.map((item) => {
                    const fotoItem = obterFotoProduto(item.codigo, item.foto);
                    return (
                      <div
                        key={`${item.codigo}_${item.validade}_${item.lote}`}
                        onClick={() => {
                          onAdicionarItemRapido(item);
                          setBuscaRapida('');
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          borderBottom: '1px solid #f1f5f9',
                          cursor: 'pointer',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f9ff')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '6px',
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              overflow: 'hidden',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {fotoItem ? (
                              <img src={fotoItem} alt={item.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <span style={{ fontSize: '0.9rem' }}>📦</span>
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>{item.nome}</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                              Cód: {item.codigo} • Val: {formatarData(item.validade)} • Disp: <b>{item.quantidade} un</b>
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0284c7' }}>
                            R$ {item.preco_venda.toFixed(2)}
                          </div>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              color: '#16a34a',
                              fontWeight: 700,
                              background: '#dcfce7',
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            + Adicionar
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* LISTA DE PRODUTOS NO CARRINHO */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#1e293b' }}>
                Itens no Carrinho ({carrinho.length} tipo{carrinho.length > 1 ? 's' : ''} / {totalItensQtd} un)
              </span>
              {carrinho.length > 0 && (
                <button
                  type="button"
                  onClick={onLimparCarrinho}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#dc2626',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Esvaziar Carrinho
                </button>
              )}
            </div>

            {carrinho.length === 0 ? (
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '30px 20px',
                  textAlign: 'center',
                  color: '#64748b',
                }}
              >
                <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🛒</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#334155' }}>
                  Nenhum produto adicionado ao carrinho
                </div>
                <p style={{ fontSize: '0.82rem', marginTop: '4px', maxWidth: '360px', margin: '4px auto 14px auto' }}>
                  Clique nos cards de produtos na tela principal ou use a busca acima para incluir produtos.
                </p>
                <button
                  type="button"
                  onClick={onAdicionarOutroProduto}
                  style={{
                    background: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Selecionar Produtos no Estoque
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {carrinho.map((item, index) => {
                  const fotoItem = obterFotoProduto(item.codigo, item.foto);
                  return (
                    <div
                      key={item.id || `${item.codigo}_${item.validade}_${index}`}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '10px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                      }}
                    >
                      {/* Foto e Descrição */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '8px',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            overflow: 'hidden',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {fotoItem ? (
                            <img src={fotoItem} alt={item.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <span style={{ fontSize: '1.1rem' }}>📦</span>
                          )}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: '0.88rem',
                              color: '#0f172a',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {item.nome}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                            Unit: <b>R$ {item.preco_unitario.toFixed(2)}</b> • Val: {formatarData(item.validade)} (Disp: {item.estoqueDisponivel} un)
                          </div>
                        </div>
                      </div>

                      {/* Controles de Quantidade */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => onAlterarQuantidade(item.id, item.quantidade - 1)}
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            background: '#f8fafc',
                            fontWeight: 800,
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            color: '#334155',
                          }}
                        >
                          -
                        </button>
                        <input
                          type="number"
                          value={item.quantidade}
                          min="1"
                          max={item.estoqueDisponivel}
                          onChange={(e) => {
                            const v = parseInt(e.target.value, 10);
                            if (!isNaN(v)) {
                              onAlterarQuantidade(item.id, v);
                            }
                          }}
                          style={{
                            width: '45px',
                            textAlign: 'center',
                            fontWeight: 800,
                            fontSize: '0.9rem',
                            padding: '4px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            background: '#fff',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => onAlterarQuantidade(item.id, item.quantidade + 1)}
                          disabled={item.quantidade >= item.estoqueDisponivel}
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            background: item.quantidade >= item.estoqueDisponivel ? '#e2e8f0' : '#f8fafc',
                            fontWeight: 800,
                            fontSize: '0.9rem',
                            cursor: item.quantidade >= item.estoqueDisponivel ? 'not-allowed' : 'pointer',
                            color: '#334155',
                          }}
                        >
                          +
                        </button>
                      </div>

                      {/* Subtotal e Remover */}
                      <div style={{ textAlign: 'right', minWidth: '75px' }}>
                        <div style={{ fontWeight: 900, fontSize: '0.92rem', color: '#0f172a' }}>
                          R$ {item.subtotal.toFixed(2)}
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemoverItem(item.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: '2px 0',
                          }}
                          title="Remover produto do carrinho"
                        >
                          🗑️ Remover
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* FORMA DE PAGAMENTO E CLIENTE FIADO */}
          {carrinho.length > 0 && (
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '14px 16px',
                marginTop: '12px',
              }}
            >
              <div className="grupo-input" style={{ margin: 0 }}>
                <label
                  className="rotulo-campo"
                  style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', marginBottom: '6px' }}
                >
                  💳 Forma de Pagamento da Venda
                </label>
                <select
                  className="input-modal"
                  value={formaPagamento}
                  onChange={(e) => setFormaPagamento(e.target.value as any)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                >
                  <option value="pix">📱 PIX</option>
                  <option value="cartao_credito">💳 Cartão de Crédito</option>
                  <option value="cartao_debito">💳 Cartão de Débito</option>
                  <option value="dinheiro">💵 Dinheiro (Espécie)</option>
                  <option value="fiado">📝 Compra em Fiado (Caderneta de Cliente)</option>
                </select>
              </div>

              {formaPagamento === 'fiado' && (
                <div
                  style={{
                    marginTop: '12px',
                    background: '#fef2f2',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #fca5a5',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ color: '#991b1b', margin: 0, fontWeight: 700, fontSize: '0.82rem' }}>
                      👤 Selecione o Cliente Fiado:
                    </label>
                    {onAbrirCadastroCliente && (
                      <button
                        type="button"
                        onClick={onAbrirCadastroCliente}
                        style={{
                          background: '#dc2626',
                          color: '#ffffff',
                          border: 'none',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        ➕ Novo Cliente
                      </button>
                    )}
                  </div>
                  <select
                    className="input-modal"
                    value={clienteFiadoId}
                    onChange={(e) => setClienteFiadoId(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #fca5a5' }}
                  >
                    <option value="">-- Selecione o Cliente Devedor --</option>
                    {clientesDevedores.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome} {c.cpfCnpj ? `(${c.cpfCnpj})` : ''} - Saldo Dev: R$ {c.saldoDevedorTotal.toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* MENSAGEM DE ERRO OU AVISO */}
          {erroMsg && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #f87171',
                borderRadius: '8px',
                padding: '10px 12px',
                color: '#991b1b',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginTop: '12px',
              }}
            >
              {erroMsg}
            </div>
          )}
        </div>

        {/* RODAPÉ COM TOTAL E BOTÃO DE BAIXA */}
        <div
          style={{
            background: '#f1f5f9',
            borderTop: '1px solid #e2e8f0',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexShrink: 0,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Total do Carrinho</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a' }}>
              R$ {totalGeral.toFixed(2).replace('.', ',')}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={onFechar}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#475569',
                padding: '10px 16px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
              }}
            >
              Continuar Comprando
            </button>
            <button
              type="button"
              onClick={handleConfirmar}
              disabled={carrinho.length === 0 || processando}
              style={{
                background:
                  carrinho.length === 0 || processando
                    ? '#94a3b8'
                    : 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.95rem',
                cursor: carrinho.length === 0 || processando ? 'not-allowed' : 'pointer',
                boxShadow: carrinho.length > 0 ? '0 4px 12px rgba(22, 163, 74, 0.3)' : 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>{processando ? 'Processando...' : '✅ Concluir Venda & Baixa'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
