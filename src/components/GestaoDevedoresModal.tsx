import React, { useState } from 'react';
import { ClienteDevedor, CompraFiado, PagamentoFiado } from '../types';

interface GestaoDevedoresModalProps {
  visivel: boolean;
  onFechar: () => void;
  clientes: ClienteDevedor[];
  lojaId: string;
  nomeLoja: string;
  operadorAtualNome: string;
  onSalvarCliente: (cliente: ClienteDevedor) => void;
  onExcluirCliente: (clienteId: string) => void;
  onRegistrarPagamento: (
    clienteId: string,
    valor: number,
    formaPagamento: 'dinheiro' | 'pix' | 'cartao_debito' | 'cartao_credito',
    observacao?: string
  ) => void;
}

export const GestaoDevedoresModal: React.FC<GestaoDevedoresModalProps> = ({
  visivel,
  onFechar,
  clientes = [],
  lojaId = '',
  nomeLoja = '',
  operadorAtualNome = '',
  onSalvarCliente,
  onExcluirCliente,
  onRegistrarPagamento,
}) => {
  if (!visivel) return null;

  const listaClientes = clientes || [];

  // Estados principais
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'pendentes' | 'quitados'>('pendentes');
  const [clienteSelecionado, setClienteSelecionado] = useState<ClienteDevedor | null>(null);

  // Modal de cadastro/edição de cliente
  const [modalNovoCliente, setModalNovoCliente] = useState(false);
  const [clienteEditando, setClienteEditando] = useState<ClienteDevedor | null>(null);
  const [formNome, setFormNome] = useState('');
  const [formTelefone, setFormTelefone] = useState('');
  const [formCpf, setFormCpf] = useState('');
  const [formEndereco, setFormEndereco] = useState('');
  const [formLimite, setFormLimite] = useState('');
  const [formObservacoes, setFormObservacoes] = useState('');
  const [erroForm, setErroForm] = useState('');

  // Modal de abate de dívida (pagamento)
  const [modalPagamento, setModalPagamento] = useState(false);
  const [valorAbatimento, setValorAbatimento] = useState('');
  const [formaPagamento, setFormaPagamento] = useState<'dinheiro' | 'pix' | 'cartao_debito' | 'cartao_credito'>('dinheiro');
  const [obsPagamento, setObsPagamento] = useState('');
  const [erroPagamento, setErroPagamento] = useState('');

  // Compra expandida no extrato
  const [compraExpandidaId, setCompraExpandidaId] = useState<string | null>(null);

  // Recibo/Comprovante de Pagamento para visualização/impressão
  const [reciboVisualizar, setReciboVisualizar] = useState<{ cliente: ClienteDevedor; pagamento: PagamentoFiado } | null>(null);

  // Aba ativa na ficha do cliente
  const [abaFicha, setAbaFicha] = useState<'compras' | 'pagamentos'>('compras');

  // KPI Calculations
  const totalDevedoresComDebito = listaClientes.filter((c) => (c.saldoDevedorTotal || 0) > 0).length;
  const totalDividasAberto = listaClientes.reduce((acc, c) => acc + (c.saldoDevedorTotal || 0), 0);

  // Filtragem de clientes
  const clientesFiltrados = listaClientes.filter((c) => {
    const termo = busca.toLowerCase().trim();
    const bateBusca =
      !termo ||
      c.nome.toLowerCase().includes(termo) ||
      (c.telefone && c.telefone.includes(termo)) ||
      (c.cpfOuCnpj && c.cpfOuCnpj.includes(termo));

    if (!bateBusca) return false;

    if (filtroStatus === 'pendentes') return (c.saldoDevedorTotal || 0) > 0;
    if (filtroStatus === 'quitados') return (c.saldoDevedorTotal || 0) === 0;
    return true;
  });

  // Abrir modal de novo cliente ou editar
  const handleAbrirModalCadastro = (cliente?: ClienteDevedor) => {
    if (cliente) {
      setClienteEditando(cliente);
      setFormNome(cliente.nome);
      setFormTelefone(cliente.telefone || '');
      setFormCpf(cliente.cpfOuCnpj || '');
      setFormEndereco(cliente.endereco || '');
      setFormLimite(cliente.limiteFiado ? cliente.limiteFiado.toString() : '');
      setFormObservacoes(cliente.observacoes || '');
    } else {
      setClienteEditando(null);
      setFormNome('');
      setFormTelefone('');
      setFormCpf('');
      setFormEndereco('');
      setFormLimite('');
      setFormObservacoes('');
    }
    setErroForm('');
    setModalNovoCliente(true);
  };

  // Salvar Cliente
  const handleSalvarClienteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim()) {
      setErroForm('Por favor, informe o nome do cliente.');
      return;
    }

    const hoje = new Date().toISOString().split('T')[0];
    const limiteNum = formLimite ? parseFloat(formLimite.replace(',', '.')) || 0 : 0;

    const clienteNovoOuEditado: ClienteDevedor = {
      id: clienteEditando ? clienteEditando.id : `cli_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      lojaId,
      nome: formNome.trim(),
      telefone: formTelefone.trim() || undefined,
      cpfOuCnpj: formCpf.trim() || undefined,
      endereco: formEndereco.trim() || undefined,
      limiteFiado: limiteNum > 0 ? limiteNum : undefined,
      observacoes: formObservacoes.trim() || undefined,
      dataCadastro: clienteEditando ? clienteEditando.dataCadastro : hoje,
      saldoDevedorTotal: clienteEditando ? clienteEditando.saldoDevedorTotal : 0,
      compras: clienteEditando ? clienteEditando.compras : [],
      pagamentos: clienteEditando ? clienteEditando.pagamentos : [],
      ativo: true,
    };

    onSalvarCliente(clienteNovoOuEditado);
    if (clienteSelecionado && clienteSelecionado.id === clienteNovoOuEditado.id) {
      setClienteSelecionado(clienteNovoOuEditado);
    }
    setModalNovoCliente(false);
  };

  // Confirmar Abatimento de Dívida
  const handleConfirmarPagamento = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteSelecionado) return;

    const valor = parseFloat(valorAbatimento.replace(',', '.'));
    if (isNaN(valor) || valor <= 0) {
      setErroPagamento('Informe um valor válido maior que R$ 0,00');
      return;
    }

    if (valor > clienteSelecionado.saldoDevedorTotal + 0.01) {
      setErroPagamento(`O valor informado (R$ ${valor.toFixed(2)}) é maior que o saldo devedor atual (R$ ${clienteSelecionado.saldoDevedorTotal.toFixed(2)}).`);
      return;
    }

    onRegistrarPagamento(clienteSelecionado.id, valor, formaPagamento, obsPagamento);

    // Atualizar visualização do cliente selecionado localmente
    const clienteAtualizado = clientes.find((c) => c.id === clienteSelecionado.id);
    if (clienteAtualizado) {
      setClienteSelecionado(clienteAtualizado);
    }

    setModalPagamento(false);
    setValorAbatimento('');
    setObsPagamento('');
    setErroPagamento('');
  };

  // Gerar mensagem formatada para WhatsApp de cobrança
  const handleEnviarWhatsApp = (cliente: ClienteDevedor) => {
    if (!cliente.telefone) {
      alert('Este cliente não possui telefone/WhatsApp cadastrado.');
      return;
    }

    const numLimpo = cliente.telefone.replace(/\D/g, '');
    const numComDDI = numLimpo.startsWith('55') ? numLimpo : `55${numLimpo}`;

    const texto = `Olá *${cliente.nome}*! 👋%0A%0APassando para informar o resumo da sua caderneta na loja *${nomeLoja}*:%0A%0A💰 *Saldo Devedor Atual:* R$ ${cliente.saldoDevedorTotal.toFixed(2).replace('.', ',')}%0A%0AQualquer dúvida sobre os itens ou se desejar realizar o pagamento via PIX, estamos à disposição! Obrigado! 🙏`;

    window.open(`https://wa.me/${numComDDI}?text=${texto}`, '_blank');
  };

  return (
    <div className="tela-relatorio-cheia" style={{ display: 'flex', zIndex: 400 }}>
      {/* CABEÇALHO */}
      <div
        className="cabecalho-relatorio"
        style={{
          padding: '8px 12px',
          height: 'auto',
          minHeight: '46px',
          display: 'flex',
          alignItems: 'center',
          justify: 'space-between',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
          <h2 style={{ fontSize: '0.92rem', fontWeight: 700, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            💳 Devedores / Caderneta
          </h2>
          <span style={{ fontSize: '0.7rem', color: '#64748b', background: '#ffffff', padding: '1px 6px', borderRadius: '10px', whiteSpace: 'nowrap', fontWeight: 600 }}>
            {nomeLoja}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
          <button
            style={{
              background: '#16a34a',
              color: '#ffffff',
              border: 'none',
              padding: '6px 10px',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              whiteSpace: 'nowrap',
            }}
            onClick={() => handleAbrirModalCadastro()}
          >
            ➕ Cadastrar Cliente
          </button>

          <button
            className="btn-voltar-rel"
            style={{ padding: '6px 10px', fontSize: '0.8rem', fontWeight: 600, background: 'rgba(255,255,255,0.15)', borderRadius: '6px' }}
            onClick={onFechar}
          >
            ✕ Fechar
          </button>
        </div>
      </div>

      {/* CORPO PRINCIPAL */}
      <div className="corpo-relatorio-cheio" style={{ gap: '10px', padding: '10px 12px', display: 'flex', flexDirection: 'column' }}>
        {/* CARDS KPIS DE DEVEDORES */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          <div style={{ background: '#ffffff', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Com Débito
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#dc2626', marginTop: '2px' }}>
              {totalDevedoresComDebito} <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#991b1b' }}>cli</span>
            </div>
          </div>

          <div style={{ background: '#ffffff', padding: '8px 10px', borderRadius: '8px', border: '1px solid #fca5a5', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '0.68rem', color: '#991b1b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Fiado Aberto
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#dc2626', marginTop: '2px' }}>
              R$ {totalDividasAberto.toFixed(2).replace('.', ',')}
            </div>
          </div>

          <div style={{ background: '#ffffff', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Cadastrados
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
              {listaClientes.length} <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#16a34a' }}>total</span>
            </div>
          </div>
        </div>

        {/* MODO FICHA DO CLIENTE OU LISTA DE CLIENTES */}
        {clienteSelecionado ? (
          /* ================= DETALHES DO CLIENTE / CADERNETA ================= */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* BARRA SUPERIOR DE AÇÕES DO CLIENTE */}
            <div
              style={{
                background: '#ffffff',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                display: 'flex',
                justify: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div>
                <button
                  style={{
                    background: '#f1f5f9',
                    color: '#0f172a',
                    border: '1px solid #cbd5e1',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    marginBottom: '4px',
                  }}
                  onClick={() => setClienteSelecionado(null)}
                >
                  ⬅️ Voltar para Lista
                </button>
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  👤 {clienteSelecionado.nome}
                  {(clienteSelecionado.saldoDevedorTotal || 0) > 0 ? (
                    <span style={{ background: '#fee2e2', color: '#991b1b', fontSize: '0.68rem', padding: '1px 6px', borderRadius: '8px' }}>
                      🔴 Em Débito
                    </span>
                  ) : (
                    <span style={{ background: '#dcfce7', color: '#166534', fontSize: '0.68rem', padding: '1px 6px', borderRadius: '8px' }}>
                      🟢 Quitado
                    </span>
                  )}
                </h3>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '1px' }}>
                  📞 {clienteSelecionado.telefone || 'Sem tel'} | CPF/CNPJ: {clienteSelecionado.cpfOuCnpj || 'Não informado'}
                </div>
              </div>

              {/* BOTOES DE ACAO DO CLIENTE */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {(clienteSelecionado.saldoDevedorTotal || 0) > 0 && (
                  <>
                    <button
                      style={{
                        background: '#16a34a',
                        color: '#ffffff',
                        border: 'none',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        setValorAbatimento('');
                        setObsPagamento('');
                        setErroPagamento('');
                        setModalPagamento(true);
                      }}
                    >
                      💲 Abater Dívida
                    </button>

                    <button
                      style={{
                        background: '#25d366',
                        color: '#ffffff',
                        border: 'none',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                      onClick={() => handleEnviarWhatsApp(clienteSelecionado)}
                    >
                      📱 Cobrar WhatsApp
                    </button>
                  </>
                )}

                <button
                  style={{
                    background: '#f8fafc',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    fontWeight: 600,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                  }}
                  onClick={() => handleAbrirModalCadastro(clienteSelecionado)}
                >
                  ✏️ Editar Dados
                </button>
              </div>
            </div>

            {/* PAINEL DE RESUMO DE CONTA */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
              <div style={{ background: '#ffffff', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Saldo Devedor</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: (clienteSelecionado.saldoDevedorTotal || 0) > 0 ? '#dc2626' : '#16a34a' }}>
                  R$ {(clienteSelecionado.saldoDevedorTotal || 0).toFixed(2).replace('.', ',')}
                </div>
              </div>

              <div style={{ background: '#ffffff', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Limite Fiado</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginTop: '1px' }}>
                  {clienteSelecionado.limiteFiado && clienteSelecionado.limiteFiado > 0
                    ? `R$ ${clienteSelecionado.limiteFiado.toFixed(2).replace('.', ',')}`
                    : 'Sem limite'}
                </div>
              </div>

              <div style={{ background: '#ffffff', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Total Comprado</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0284c7', marginTop: '1px' }}>
                  R$ {(clienteSelecionado.compras || []).reduce((a, c) => a + c.valorTotal, 0).toFixed(2).replace('.', ',')}
                </div>
              </div>

              <div style={{ background: '#ffffff', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Total Pagamentos</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#16a34a', marginTop: '1px' }}>
                  R$ {(clienteSelecionado.pagamentos || []).reduce((a, p) => a + p.valorPago, 0).toFixed(2).replace('.', ',')}
                </div>
              </div>
            </div>

            {/* ABAS DA FICHA (COMPRAS VS PAGAMENTOS) */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e2e8f0', paddingBottom: '2px' }}>
              <button
                style={{
                  padding: '8px 16px',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  borderBottom: abaFicha === 'compras' ? '3px solid #0284c7' : 'none',
                  color: abaFicha === 'compras' ? '#0284c7' : '#64748b',
                }}
                onClick={() => setAbaFicha('compras')}
              >
                🛒 Compras Fiado ({(clienteSelecionado.compras || []).length})
              </button>
              <button
                style={{
                  padding: '8px 16px',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  borderBottom: abaFicha === 'pagamentos' ? '3px solid #16a34a' : 'none',
                  color: abaFicha === 'pagamentos' ? '#16a34a' : '#64748b',
                }}
                onClick={() => setAbaFicha('pagamentos')}
              >
                🧾 Histórico de Pagamentos Recebidos ({(clienteSelecionado.pagamentos || []).length})
              </button>
            </div>

            {/* CONTEÚDO DAS ABAS DA FICHA */}
            {abaFicha === 'compras' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {clienteSelecionado.compras.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', background: '#ffffff', borderRadius: '10px', color: '#64748b' }}>
                    Nenhuma compra fiado registrada para este cliente.
                  </div>
                ) : (
                  clienteSelecionado.compras
                    .slice()
                    .reverse()
                    .map((compra) => {
                      const isExpandida = compraExpandidaId === compra.id;
                      return (
                        <div
                          key={compra.id}
                          style={{
                            background: '#ffffff',
                            borderRadius: '10px',
                            border: '1px solid #e2e8f0',
                            overflow: 'hidden',
                          }}
                        >
                          <div style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <b style={{ fontSize: '0.9rem', color: '#0f172a' }}>Compra #{compra.id.slice(-6)}</b>
                                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                  📅 {compra.data} às {compra.hora}
                                </span>
                                {compra.status === 'quitada' && (
                                  <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                                    🟢 Quitada
                                  </span>
                                )}
                                {compra.status === 'parcial' && (
                                  <span style={{ background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                                    🟡 Abatida Parcial
                                  </span>
                                )}
                                {compra.status === 'pendente' && (
                                  <span style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                                    🔴 Pendente Total
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '2px' }}>
                                👤 Atendido por: <b>{compra.operadorNome}</b>
                              </div>
                            </div>

                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                                Total: R$ {compra.valorTotal.toFixed(2).replace('.', ',')}
                              </div>
                              <div style={{ fontSize: '0.82rem', color: compra.saldoRestante > 0 ? '#dc2626' : '#16a34a', fontWeight: 700 }}>
                                Resta: R$ {compra.saldoRestante.toFixed(2).replace('.', ',')}
                              </div>
                            </div>
                          </div>

                          <div style={{ padding: '0 14px 10px 14px', display: 'flex', justifyContent: 'flex-start' }}>
                            <button
                              style={{
                                background: '#f1f5f9',
                                border: '1px solid #cbd5e1',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                              onClick={() => setCompraExpandidaId(isExpandida ? null : compra.id)}
                            >
                              {isExpandida ? '▲ Ocultar Itens Comprados' : `▼ Ver Itens Comprados (${compra.itens?.length || 0})`}
                            </button>
                          </div>

                          {/* LISTA EXPANDIDA DOS ITENS COMPRADOS */}
                          {isExpandida && (
                            <div style={{ background: '#f8fafc', padding: '12px 14px', borderTop: '1px solid #e2e8f0' }}>
                              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                📦 Produtos Adquiridos nesta Compra:
                              </div>
                              <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                                <thead>
                                  <tr style={{ background: '#e2e8f0', color: '#334155', textAlign: 'left' }}>
                                    <th style={{ padding: '6px' }}>Produto</th>
                                    <th style={{ padding: '6px', textAlign: 'center' }}>Qtd</th>
                                    <th style={{ padding: '6px', textAlign: 'right' }}>Unit. (R$)</th>
                                    <th style={{ padding: '6px', textAlign: 'right' }}>Subtotal (R$)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {compra.itens && compra.itens.length > 0 ? (
                                    compra.itens.map((it, idx) => (
                                      <tr key={idx} style={{ borderBottom: '1px solid #cbd5e1' }}>
                                        <td style={{ padding: '6px' }}>{it.nome}</td>
                                        <td style={{ padding: '6px', textAlign: 'center' }}>{it.quantidade}</td>
                                        <td style={{ padding: '6px', textAlign: 'right' }}>{it.preco_unitario.toFixed(2)}</td>
                                        <td style={{ padding: '6px', textAlign: 'right', fontWeight: 600 }}>{it.subtotal.toFixed(2)}</td>
                                      </tr>
                                    ))
                                  ) : (
                                    <tr>
                                      <td colSpan={4} style={{ padding: '8px', textAlign: 'center', color: '#64748b' }}>
                                        Itens não especificados nesta venda antiga.
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })
                )}
              </div>
            ) : (
              /* ABA DE HISTÓRICO DE PAGAMENTOS */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {clienteSelecionado.pagamentos.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', background: '#ffffff', borderRadius: '10px', color: '#64748b' }}>
                    Nenhum pagamento registrado até o momento.
                  </div>
                ) : (
                  clienteSelecionado.pagamentos
                    .slice()
                    .reverse()
                    .map((pag) => (
                      <div
                        key={pag.id}
                        style={{
                          background: '#ffffff',
                          padding: '12px 14px',
                          borderRadius: '10px',
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          justify: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '10px',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#16a34a' }}>
                              💵 Abatimento de R$ {pag.valorPago.toFixed(2).replace('.', ',')}
                            </span>
                            <span style={{ fontSize: '0.75rem', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                              {pag.formaPagamento.toUpperCase()}
                            </span>
                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                              📅 {pag.data} às {pag.hora}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '4px' }}>
                            👤 Recebido por: <b>{pag.operadorNome}</b>
                            {pag.observacao && <span> | Obs: <i>{pag.observacao}</i></span>}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                            Saldo Antes: R$ {pag.saldoAnterior.toFixed(2)} ➔ <b>Restou Devendo: R$ {pag.saldoRestante.toFixed(2)}</b>
                          </div>
                        </div>

                        <button
                          style={{
                            background: '#f1f5f9',
                            color: '#0f172a',
                            border: '1px solid #cbd5e1',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                          onClick={() => setReciboVisualizar({ cliente: clienteSelecionado, pagamento: pag })}
                        >
                          🧾 Recibo
                        </button>
                      </div>
                    ))
                )}
              </div>
            )}
          </div>
        ) : (
          /* ================= LISTA DE CLIENTES E BUSCA ================= */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* PAINEL DE BUSCA E FILTROS */}
            <div
              style={{
                background: '#ffffff',
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="🔍 Buscar por nome, telefone ou CPF..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  style={{
                    flex: 1,
                    minWidth: '150px',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.82rem',
                  }}
                />

                {/* FILTROS DE STATUS */}
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    style={{
                      padding: '5px 8px',
                      borderRadius: '6px',
                      border: '1px solid',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      background: filtroStatus === 'pendentes' ? '#fee2e2' : '#ffffff',
                      color: filtroStatus === 'pendentes' ? '#991b1b' : '#475569',
                      borderColor: filtroStatus === 'pendentes' ? '#fca5a5' : '#cbd5e1',
                    }}
                    onClick={() => setFiltroStatus('pendentes')}
                  >
                    🔴 Débito ({listaClientes.filter((c) => (c.saldoDevedorTotal || 0) > 0).length})
                  </button>

                  <button
                    style={{
                      padding: '5px 8px',
                      borderRadius: '6px',
                      border: '1px solid',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      background: filtroStatus === 'quitados' ? '#dcfce7' : '#ffffff',
                      color: filtroStatus === 'quitados' ? '#166534' : '#475569',
                      borderColor: filtroStatus === 'quitados' ? '#86efac' : '#cbd5e1',
                    }}
                    onClick={() => setFiltroStatus('quitados')}
                  >
                    🟢 Quitados ({listaClientes.filter((c) => (c.saldoDevedorTotal || 0) === 0).length})
                  </button>

                  <button
                    style={{
                      padding: '5px 8px',
                      borderRadius: '6px',
                      border: '1px solid',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      background: filtroStatus === 'todos' ? '#0284c7' : '#ffffff',
                      color: filtroStatus === 'todos' ? '#ffffff' : '#475569',
                      borderColor: filtroStatus === 'todos' ? '#0284c7' : '#cbd5e1',
                    }}
                    onClick={() => setFiltroStatus('todos')}
                  >
                    Todos ({listaClientes.length})
                  </button>
                </div>
              </div>
            </div>

            {/* LISTAGEM DE CLIENTES */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '8px' }}>
              {clientesFiltrados.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', padding: '20px 14px', textAlign: 'center', background: '#ffffff', borderRadius: '8px', color: '#64748b', fontSize: '0.85rem' }}>
                  Nenhum cliente fiado encontrado para os filtros selecionados.
                </div>
              ) : (
                clientesFiltrados.map((cliente) => (
                  <div
                    key={cliente.id}
                    style={{
                      background: '#ffffff',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: (cliente.saldoDevedorTotal || 0) > 0 ? '1px solid #fca5a5' : '1px solid #e2e8f0',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      justify: 'space-between',
                      gap: '8px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '0.88rem', color: '#0f172a', fontWeight: 700 }}>
                            👤 {cliente.nome}
                          </h4>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '1px' }}>
                            📞 {cliente.telefone || 'Sem telefone'}
                          </div>
                        </div>

                        {(cliente.saldoDevedorTotal || 0) > 0 ? (
                          <span style={{ background: '#fee2e2', color: '#991b1b', fontSize: '0.68rem', padding: '1px 6px', borderRadius: '8px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                            🔴 Débito
                          </span>
                        ) : (
                          <span style={{ background: '#dcfce7', color: '#166534', fontSize: '0.68rem', padding: '1px 6px', borderRadius: '8px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                            🟢 Quitado
                          </span>
                        )}
                      </div>

                      {/* VALOR DEVENDO */}
                      <div style={{ marginTop: '8px', background: (cliente.saldoDevedorTotal || 0) > 0 ? '#fef2f2' : '#f0fdf4', padding: '6px 8px', borderRadius: '6px', border: (cliente.saldoDevedorTotal || 0) > 0 ? '1px solid #fecaca' : '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>Saldo Devedor:</div>
                          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: (cliente.saldoDevedorTotal || 0) > 0 ? '#dc2626' : '#16a34a' }}>
                            R$ {(cliente.saldoDevedorTotal || 0).toFixed(2).replace('.', ',')}
                          </div>
                        </div>
                        {cliente.limiteFiado && cliente.limiteFiado > 0 ? (
                          <div style={{ fontSize: '0.7rem', color: '#475569', textAlign: 'right' }}>
                            Lim: R$ {cliente.limiteFiado.toFixed(2)}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* BOTOES DE ACAO CARD CLIENTE */}
                    <div style={{ display: 'flex', gap: '4px', borderTop: '1px dashed #e2e8f0', paddingTop: '8px' }}>
                      <button
                        style={{
                          flex: 1,
                          background: '#0284c7',
                          color: '#ffffff',
                          border: 'none',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          textAlign: 'center',
                        }}
                        onClick={() => setClienteSelecionado(cliente)}
                      >
                        📂 Caderneta
                      </button>

                      {(cliente.saldoDevedorTotal || 0) > 0 && (
                        <button
                          style={{
                            background: '#16a34a',
                            color: '#ffffff',
                            border: 'none',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                          onClick={() => {
                            setClienteSelecionado(cliente);
                            setValorAbatimento('');
                            setObsPagamento('');
                            setErroPagamento('');
                            setModalPagamento(true);
                          }}
                        >
                          💲 Abater
                        </button>
                      )}

                      <button
                        style={{
                          background: '#f1f5f9',
                          color: '#334155',
                          border: '1px solid #cbd5e1',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                        }}
                        onClick={() => handleAbrirModalCadastro(cliente)}
                        title="Editar Dados do Cliente"
                      >
                        ✏️
                      </button>

                      <button
                        style={{
                          background: '#fee2e2',
                          color: '#dc2626',
                          border: '1px solid #fca5a5',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                        }}
                        title="Excluir Cliente"
                        onClick={() => {
                          if ((cliente.saldoDevedorTotal || 0) > 0) {
                            alert(`Não é possível excluir o cliente ${cliente.nome} pois ele possui saldo devedor pendente de R$ ${(cliente.saldoDevedorTotal || 0).toFixed(2)}.`);
                            return;
                          }
                          if (confirm(`Deseja realmente excluir o cliente ${cliente.nome}?`)) {
                            onExcluirCliente(cliente.id);
                          }
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* ================= MODAL DE FORMULÁRIO DE CADASTRO/EDIÇÃO DE CLIENTE ================= */}
      {modalNovoCliente && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="modal-container" style={{ maxWidth: '480px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0 }}>
                {clienteEditando ? '✏️ Editar Cliente Fiado' : '➕ Novo Cliente Fiado'}
              </h3>
              <button className="btn-fechar-modal" onClick={() => setModalNovoCliente(false)}>&times;</button>
            </div>

            <form onSubmit={handleSalvarClienteSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {erroForm && (
                <div style={{ background: '#fee2e2', color: '#dc2626', padding: '8px 12px', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 600 }}>
                  ⚠️ {erroForm}
                </div>
              )}

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>Nome Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: João da Silva"
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', marginTop: '4px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>Telefone / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="(00) 90000-0000"
                    value={formTelefone}
                    onChange={(e) => setFormTelefone(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', marginTop: '4px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>CPF / CNPJ (Opcional)</label>
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    value={formCpf}
                    onChange={(e) => setFormCpf(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', marginTop: '4px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>Limite Autorizado de Fiado (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 500.00 (Deixe em branco para sem limite)"
                  value={formLimite}
                  onChange={(e) => setFormLimite(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', marginTop: '4px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>Endereço (Opcional)</label>
                <input
                  type="text"
                  placeholder="Rua, Número, Bairro"
                  value={formEndereco}
                  onChange={(e) => setFormEndereco(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', marginTop: '4px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>Observações / Anotações</label>
                <textarea
                  rows={2}
                  placeholder="Anotações internas..."
                  value={formObservacoes}
                  onChange={(e) => setFormObservacoes(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', marginTop: '4px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  style={{ flex: 1, padding: '10px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 600 }}
                  onClick={() => setModalNovoCliente(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ flex: 1, padding: '10px', background: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 700 }}
                >
                  Salvar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL DE ABATER DÍVIDA / REGISTRAR PAGAMENTO ================= */}
      {modalPagamento && clienteSelecionado && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="modal-container" style={{ maxWidth: '440px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, color: '#16a34a' }}>
                💲 Registrar Abatimento / Pagamento
              </h3>
              <button className="btn-fechar-modal" onClick={() => setModalPagamento(false)}>&times;</button>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Cliente: <b>{clienteSelecionado.nome}</b></div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#dc2626', marginTop: '2px' }}>
                Dívida Atual: R$ {clienteSelecionado.saldoDevedorTotal.toFixed(2).replace('.', ',')}
              </div>
            </div>

            <form onSubmit={handleConfirmarPagamento} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {erroPagamento && (
                <div style={{ background: '#fee2e2', color: '#dc2626', padding: '8px 12px', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 600 }}>
                  ⚠️ {erroPagamento}
                </div>
              )}

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>Valor Entregue pelo Cliente (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0,00"
                  value={valorAbatimento}
                  onChange={(e) => setValorAbatimento(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '2px solid #16a34a', fontSize: '1.3rem', fontWeight: 800, marginTop: '4px' }}
                />
                {/* BOTÕES RÁPIDOS DE VALOR */}
                <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                  <button
                    type="button"
                    style={{ flex: 1, padding: '4px', background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                    onClick={() => setValorAbatimento(clienteSelecionado.saldoDevedorTotal.toFixed(2))}
                  >
                    Quitar Tudo (R$ {clienteSelecionado.saldoDevedorTotal.toFixed(2)})
                  </button>
                  {clienteSelecionado.saldoDevedorTotal > 10 && (
                    <button
                      type="button"
                      style={{ padding: '4px 8px', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                      onClick={() => setValorAbatimento((clienteSelecionado.saldoDevedorTotal / 2).toFixed(2))}
                    >
                      50% (R$ {(clienteSelecionado.saldoDevedorTotal / 2).toFixed(2)})
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>Forma de Recebimento</label>
                <select
                  value={formaPagamento}
                  onChange={(e) => setFormaPagamento(e.target.value as any)}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', marginTop: '4px' }}
                >
                  <option value="dinheiro">💵 Dinheiro</option>
                  <option value="pix">📱 PIX</option>
                  <option value="cartao_debito">💳 Cartão de Débito</option>
                  <option value="cartao_credito">💳 Cartão de Crédito</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>Observação (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: Abatimento parcial da compra do mês"
                  value={obsPagamento}
                  onChange={(e) => setObsPagamento(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', marginTop: '4px' }}
                />
              </div>

              {/* CALCULO DE RESULTADO */}
              {valorAbatimento && !isNaN(parseFloat(valorAbatimento)) && (
                <div style={{ background: '#f0fdf4', padding: '10px', borderRadius: '6px', border: '1px solid #bbf7d0', fontSize: '0.82rem', color: '#166534' }}>
                  Saldo Restante após Pagamento: <b>R$ {Math.max(0, clienteSelecionado.saldoDevedorTotal - parseFloat(valorAbatimento)).toFixed(2).replace('.', ',')}</b>
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  style={{ flex: 1, padding: '10px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 600 }}
                  onClick={() => setModalPagamento(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ flex: 1, padding: '10px', background: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 700 }}
                >
                  Confirmar Pagamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL DE RECIBO / COMPROVANTE DE PAGAMENTO ================= */}
      {reciboVisualizar && (
        <div className="modal-overlay" style={{ zIndex: 10001 }}>
          <div className="modal-container" style={{ maxWidth: '380px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0 }}>🧾 Recibo de Abatimento</h3>
              <button className="btn-fechar-modal" onClick={() => setReciboVisualizar(null)}>&times;</button>
            </div>

            <div className="cupom-termico-box">
              <div className="cupom-header">
                <h4>{nomeLoja}</h4>
                <p>RECIBO DE PAGAMENTO DE FIADO</p>
                <div className="cupom-divisor">-----------------------------------------</div>
                <p><strong>CLIENTE:</strong> {reciboVisualizar.cliente.nome}</p>
                <p><strong>DATA/HORA:</strong> {reciboVisualizar.pagamento.data} {reciboVisualizar.pagamento.hora}</p>
                <p><strong>RECEBIDO POR:</strong> {reciboVisualizar.pagamento.operadorNome}</p>
                <p><strong>FORMA PGTO:</strong> {reciboVisualizar.pagamento.formaPagamento.toUpperCase()}</p>
                <div className="cupom-divisor">-----------------------------------------</div>
              </div>

              <div className="cupom-totais">
                <div className="cupom-linha-total">
                  <span>DÍVIDA ANTERIOR:</span>
                  <span>R$ {reciboVisualizar.pagamento.saldoAnterior.toFixed(2)}</span>
                </div>
                <div className="cupom-linha-total highlight-total" style={{ color: '#16a34a' }}>
                  <span>VALOR PAGO:</span>
                  <span><strong>R$ {reciboVisualizar.pagamento.valorPago.toFixed(2)}</strong></span>
                </div>
                <div className="cupom-linha-total">
                  <span>SALDO RESTANTE:</span>
                  <span><strong>R$ {reciboVisualizar.pagamento.saldoRestante.toFixed(2)}</strong></span>
                </div>
              </div>

              <div className="cupom-divisor">-----------------------------------------</div>
              <div className="cupom-footer">
                <p style={{ fontSize: '0.75rem' }}>Comprovante de pagamento emitido com sucesso.</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
              <button
                style={{ flex: 1, padding: '8px', background: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 700 }}
                onClick={() => window.print()}
              >
                🖨️ Imprimir
              </button>
              <button
                style={{ flex: 1, padding: '8px', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 600 }}
                onClick={() => setReciboVisualizar(null)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
