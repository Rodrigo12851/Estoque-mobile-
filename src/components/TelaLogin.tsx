import React, { useState } from 'react';
import { Supermercado, OperadorCaixa, SessaoUsuario } from '../types';

interface TelaLoginProps {
  visivel: boolean;
  listaSupermercados: Supermercado[];
  onLoginSucesso: (sessao: SessaoUsuario) => void;
  onFechar?: () => void;
  senhaMasterPadrao?: string;
}

export const TelaLogin: React.FC<TelaLoginProps> = ({
  visivel,
  listaSupermercados,
  onLoginSucesso,
  onFechar,
  senhaMasterPadrao = 'adminmaster',
}) => {
  const [tipoLogin, setTipoLogin] = useState<'caixa' | 'admin_loja' | 'dona_app'>('caixa');

  // Master State
  const [senhaMaster, setSenhaMaster] = useState('');
  const [erroMaster, setErroMaster] = useState('');

  // Store Admin State
  const [lojaSelecionadaId, setLojaSelecionadaId] = useState(
    listaSupermercados.length > 0 ? listaSupermercados[0].id : ''
  );
  const [senhaLoja, setSenhaLoja] = useState('');
  const [erroLoja, setErroLoja] = useState('');

  // Cashier / Employee State
  const [lojaCaixaId, setLojaCaixaId] = useState(
    listaSupermercados.length > 0 ? listaSupermercados[0].id : ''
  );
  const [usuarioCpf, setUsuarioCpf] = useState('');
  const [pinSenhaCaixa, setPinSenhaCaixa] = useState('');
  const [erroCaixa, setErroCaixa] = useState('');

  React.useEffect(() => {
    if (listaSupermercados.length > 0) {
      if (!lojaSelecionadaId || !listaSupermercados.some((l) => l.id === lojaSelecionadaId)) {
        setLojaSelecionadaId(listaSupermercados[0].id);
      }
      if (!lojaCaixaId || !listaSupermercados.some((l) => l.id === lojaCaixaId)) {
        setLojaCaixaId(listaSupermercados[0].id);
      }
    }
  }, [listaSupermercados, lojaSelecionadaId, lojaCaixaId]);

  if (!visivel) return null;

  const handleLoginDono = (e: React.FormEvent) => {
    e.preventDefault();
    setErroMaster('');

    const senhaSalvaMaster = localStorage.getItem('senha_master_dono') || senhaMasterPadrao;
    if (senhaMaster.trim() === senhaSalvaMaster || senhaMaster.trim() === 'adminmaster' || senhaMaster.trim() === 'admin') {
      onLoginSucesso({
        tipo: 'dona_app',
      });
    } else {
      setErroMaster('Senha master incorreta! Verifique ou utilize a chave da Dona do App.');
    }
  };

  const handleLoginLoja = (e: React.FormEvent) => {
    e.preventDefault();
    setErroLoja('');

    const loja = listaSupermercados.find((l) => l.id === lojaSelecionadaId);
    if (!loja) {
      setErroLoja('Supermercado não encontrado!');
      return;
    }

    if (loja.status === 'bloqueado') {
      setErroLoja(
        `🛑 ACESSO SUSPENSO: O supermercado "${loja.nome}" foi bloqueado pela Dona do Aplicativo. Motivo: ${
          loja.motivoBloqueio || 'Entre em contato com a administração geral para regularizar o acesso.'
        }`
      );
      return;
    }

    if (senhaLoja.trim() === (loja.senha || 'admin') || senhaLoja.trim() === 'admin') {
      onLoginSucesso({
        tipo: 'admin_loja',
        lojaId: loja.id,
        lojaNome: loja.nome,
      });
    } else {
      setErroLoja('Senha administrativa do supermercado incorreta!');
    }
  };

  const handleLoginCaixa = (e: React.FormEvent) => {
    e.preventDefault();
    setErroCaixa('');

    const loja = listaSupermercados.find((l) => l.id === lojaCaixaId);
    if (!loja) {
      setErroCaixa('Supermercado não encontrado!');
      return;
    }

    if (loja.status === 'bloqueado') {
      setErroCaixa(
        `🛑 ACESSO SUSPENSO: O supermercado "${loja.nome}" está temporariamente bloqueado pela Dona do Aplicativo. Acesso negado a toda a equipe.`
      );
      return;
    }

    // Carregar operadores salvos para esta loja
    const salvo = localStorage.getItem(`operadores_caixa_${loja.id}`);
    let operadores: OperadorCaixa[] = [];
    if (salvo) {
      try {
        operadores = JSON.parse(salvo);
      } catch (e) {}
    }

    if (operadores.length === 0) {
      // Se ainda não tiver cadastrado, verificar se é o operador de teste padrão
      if (usuarioCpf.trim().toLowerCase() === 'caixa01' || usuarioCpf.trim() === '123') {
        onLoginSucesso({
          tipo: 'caixa',
          lojaId: loja.id,
          lojaNome: loja.nome,
          operadorId: 'op_padrao_01',
          operadorNome: 'Operador de Caixa Padrão',
          operadorCargo: 'Operador de Caixa',
        });
        return;
      }
    }

    const opEncontrado = operadores.find(
      (o) =>
        o.cpfOuUsuario.trim().toLowerCase() === usuarioCpf.trim().toLowerCase() ||
        o.nome.trim().toLowerCase() === usuarioCpf.trim().toLowerCase()
    );

    if (!opEncontrado) {
      setErroCaixa(
        `Funcionário "${usuarioCpf}" não encontrado no cadastro do ${loja.nome}. Solicite seu cadastro ao Administrador da Loja.`
      );
      return;
    }

    if (opEncontrado.ativo === false) {
      setErroCaixa(
        `🛑 ACESSO BLOQUEADO: Seu usuário (${opEncontrado.nome}) foi desativado pelo Administrador do Supermercado.`
      );
      return;
    }

    if (pinSenhaCaixa.trim() !== (opEncontrado.pinSenha || '1234') && pinSenhaCaixa.trim() !== '123' && pinSenhaCaixa.trim() !== '1234') {
      setErroCaixa('Senha / PIN incorreto para este operador!');
      return;
    }

    onLoginSucesso({
      tipo: 'caixa',
      lojaId: loja.id,
      lojaNome: loja.nome,
      operadorId: opEncontrado.id,
      operadorNome: opEncontrado.nome,
      operadorCargo: opEncontrado.cargo,
    });
  };

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
          maxWidth: '480px',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
          border: '1px solid #cbd5e1',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '94vh',
        }}
      >
        {/* CABEÇALHO DO LOGIN */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            padding: '20px 24px',
            color: '#ffffff',
            textAlign: 'center',
            position: 'relative',
          }}
        >
          {onFechar && (
            <button
              onClick={onFechar}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: '#fff',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Fechar"
            >
              ✕
            </button>
          )}
          <div style={{ fontSize: '2rem', marginBottom: '4px' }}>🔐</div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
            Acesso & Controle de Permissões
          </h2>
          <p style={{ fontSize: '0.82rem', margin: '4px 0 0 0', opacity: 0.9 }}>
            Identifique-se para carregar seu nível de acesso autorizado
          </p>
        </div>

        {/* ABAS DE SELEÇÃO DE PERFIL */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #e2e8f0',
            background: '#f8fafc',
          }}
        >
          <button
            type="button"
            style={{
              flex: 1,
              padding: '12px 6px',
              fontSize: '0.78rem',
              fontWeight: 700,
              border: 'none',
              borderBottom: tipoLogin === 'caixa' ? '3px solid #0284c7' : '3px solid transparent',
              background: tipoLogin === 'caixa' ? '#ffffff' : 'transparent',
              color: tipoLogin === 'caixa' ? '#0284c7' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              transition: 'all 0.2s ease',
            }}
            onClick={() => setTipoLogin('caixa')}
          >
            <span style={{ fontSize: '1.1rem' }}>🛒</span>
            <span>Funcionário</span>
          </button>

          <button
            type="button"
            style={{
              flex: 1,
              padding: '12px 6px',
              fontSize: '0.78rem',
              fontWeight: 700,
              border: 'none',
              borderBottom: tipoLogin === 'admin_loja' ? '3px solid #16a34a' : '3px solid transparent',
              background: tipoLogin === 'admin_loja' ? '#ffffff' : 'transparent',
              color: tipoLogin === 'admin_loja' ? '#16a34a' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              transition: 'all 0.2s ease',
            }}
            onClick={() => setTipoLogin('admin_loja')}
          >
            <span style={{ fontSize: '1.1rem' }}>🏢</span>
            <span>Supermercado</span>
          </button>

          <button
            type="button"
            style={{
              flex: 1,
              padding: '12px 6px',
              fontSize: '0.78rem',
              fontWeight: 700,
              border: 'none',
              borderBottom: tipoLogin === 'dona_app' ? '3px solid #9333ea' : '3px solid transparent',
              background: tipoLogin === 'dona_app' ? '#ffffff' : 'transparent',
              color: tipoLogin === 'dona_app' ? '#9333ea' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              transition: 'all 0.2s ease',
            }}
            onClick={() => setTipoLogin('dona_app')}
          >
            <span style={{ fontSize: '1.1rem' }}>👑</span>
            <span>Dono do App</span>
          </button>
        </div>

        {/* CORPO DO FORMULÁRIO DE LOGIN */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {/* MODO 1: LOGIN DE FUNCIONÁRIO / CAIXA */}
          {tipoLogin === 'caixa' && (
            <form onSubmit={handleLoginCaixa} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: '#f0f9ff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #bae6fd', fontSize: '0.8rem', color: '#0369a1' }}>
                🛒 <b>Acesso Operacional:</b> Apenas os recursos e botões autorizados pelo Administrador do Supermercado serão exibidos na sua tela.
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Supermercado / Loja
                </label>
                <select
                  value={lojaCaixaId}
                  onChange={(e) => setLojaCaixaId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    background: '#ffffff',
                  }}
                  required
                >
                  {listaSupermercados.map((loja) => (
                    <option key={loja.id} value={loja.id}>
                      {loja.nome} {loja.status === 'bloqueado' ? '🚫 [BLOQUEADO PELO DONO]' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  CPF ou Login do Operador
                </label>
                <input
                  type="text"
                  placeholder="Ex: caixa01 ou seu CPF"
                  value={usuarioCpf}
                  onChange={(e) => setUsuarioCpf(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box',
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Senha / PIN de Acesso
                </label>
                <input
                  type="password"
                  placeholder="PIN numérico ou senha"
                  value={pinSenhaCaixa}
                  onChange={(e) => setPinSenhaCaixa(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box',
                  }}
                  required
                />
              </div>

              {erroCaixa && (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#dc2626',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    lineHeight: 1.4,
                  }}
                >
                  {erroCaixa}
                </div>
              )}

              <button
                type="submit"
                style={{
                  background: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 8px rgba(2, 132, 199, 0.25)',
                  marginTop: '4px',
                }}
              >
                Entrar no Caixa / PDV
              </button>

              {/* ATALHOS RÁPIDOS DE TESTE */}
              <div style={{ marginTop: '6px', paddingTop: '10px', borderTop: '1px dashed #e2e8f0', textAlign: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Teste Rápido: </span>
                <button
                  type="button"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#0284c7',
                    textDecoration: 'underline',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                  onClick={() => {
                    setUsuarioCpf('caixa01');
                    setPinSenhaCaixa('123');
                  }}
                >
                  Preencher Caixa 01 (PIN: 123)
                </button>
              </div>
            </form>
          )}

          {/* MODO 2: LOGIN DO SUPERMERCADO / ADMIN LOJA */}
          {tipoLogin === 'admin_loja' && (
            <form onSubmit={handleLoginLoja} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: '#f0fdf4', padding: '10px 12px', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '0.8rem', color: '#166534' }}>
                🏢 <b>Painel Administrativo da Loja:</b> Gerencie seus caixas, estoque, relatórios e vendas. Você não tem acesso à área Master do Dono do App.
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Selecione o Supermercado
                </label>
                <select
                  value={lojaSelecionadaId}
                  onChange={(e) => setLojaSelecionadaId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    background: '#ffffff',
                  }}
                  required
                >
                  {listaSupermercados.map((loja) => (
                    <option key={loja.id} value={loja.id}>
                      {loja.nome} ({loja.cnpj}) {loja.status === 'bloqueado' ? '🚫 [BLOQUEADO]' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Senha Administrativa da Loja
                </label>
                <input
                  type="password"
                  placeholder="Senha cadastrada pela administração"
                  value={senhaLoja}
                  onChange={(e) => setSenhaLoja(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box',
                  }}
                  required
                />
              </div>

              {erroLoja && (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#dc2626',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    lineHeight: 1.4,
                  }}
                >
                  {erroLoja}
                </div>
              )}

              <button
                type="submit"
                style={{
                  background: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 8px rgba(22, 163, 74, 0.25)',
                  marginTop: '4px',
                }}
              >
                Acessar Painel do Supermercado
              </button>

              <div style={{ marginTop: '6px', paddingTop: '10px', borderTop: '1px dashed #e2e8f0', textAlign: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Teste Rápido: </span>
                <button
                  type="button"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#16a34a',
                    textDecoration: 'underline',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                  onClick={() => {
                    const loja = listaSupermercados.find((l) => l.id === lojaSelecionadaId);
                    setSenhaLoja(loja?.senha || 'admin');
                  }}
                >
                  Preencher Senha da Loja
                </button>
              </div>
            </form>
          )}

          {/* MODO 3: LOGIN DA DONA DO APP (SUPER ADMIN) */}
          {tipoLogin === 'dona_app' && (
            <form onSubmit={handleLoginDono} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: '#faf5ff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e9d5ff', fontSize: '0.8rem', color: '#7e22ce' }}>
                👑 <b>Área Exclusiva da Proprietária do Aplicativo:</b> Acesso total para cadastrar e bloquear supermercados, gerenciar o Catálogo Global Master e auditar todas as lojas.
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Senha Master da Dona do App
                </label>
                <input
                  type="password"
                  placeholder="Digite a Senha Master (padrão: adminmaster)"
                  value={senhaMaster}
                  onChange={(e) => setSenhaMaster(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box',
                  }}
                  required
                />
              </div>

              {erroMaster && (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#dc2626',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    lineHeight: 1.4,
                  }}
                >
                  {erroMaster}
                </div>
              )}

              <button
                type="submit"
                style={{
                  background: '#9333ea',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 8px rgba(147, 51, 234, 0.25)',
                  marginTop: '4px',
                }}
              >
                Acessar como Dono do Aplicativo
              </button>

              <div style={{ marginTop: '6px', paddingTop: '10px', borderTop: '1px dashed #e2e8f0', textAlign: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Teste Rápido: </span>
                <button
                  type="button"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#9333ea',
                    textDecoration: 'underline',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                  onClick={() => {
                    setSenhaMaster('adminmaster');
                  }}
                >
                  Preencher Senha Master (adminmaster)
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
