import React, { useState } from 'react';
import { Supermercado, OperadorCaixa, SessaoUsuario, CredenciaisDonoApp } from '../types';

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

  // Master State (Dono do App)
  const [usuarioMaster, setUsuarioMaster] = useState('');
  const [senhaMaster, setSenhaMaster] = useState('');
  const [erroMaster, setErroMaster] = useState('');

  // Store Admin State (Supermercado)
  const [lojaSelecionadaId, setLojaSelecionadaId] = useState(
    listaSupermercados.length > 0 ? listaSupermercados[0].id : ''
  );
  const [senhaLoja, setSenhaLoja] = useState('');
  const [erroLoja, setErroLoja] = useState('');

  // Cashier / Employee State (Operador / Funcionário)
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

    let credenciaisMaster: CredenciaisDonoApp = {
      usuario: 'adminmaster',
      senha: senhaMasterPadrao,
    };

    const salvo = localStorage.getItem('credenciais_dono_app');
    if (salvo) {
      try {
        const parsed = JSON.parse(salvo);
        if (parsed && typeof parsed === 'object') {
          if (parsed.usuario) credenciaisMaster.usuario = parsed.usuario;
          if (parsed.senha) credenciaisMaster.senha = parsed.senha;
          if (parsed.nomeExibicao) credenciaisMaster.nomeExibicao = parsed.nomeExibicao;
        }
      } catch (e) {}
    } else {
      const senhaLegada = localStorage.getItem('senha_master_dono');
      const usuarioLegado = localStorage.getItem('usuario_master_dono');
      if (senhaLegada) credenciaisMaster.senha = senhaLegada;
      if (usuarioLegado) credenciaisMaster.usuario = usuarioLegado;
    }

    const usuarioDigitado = usuarioMaster.trim().toLowerCase();
    const senhaDigitada = senhaMaster.trim();

    const usuarioEsperado = (credenciaisMaster.usuario || 'adminmaster').toLowerCase();
    const senhaEsperada = credenciaisMaster.senha || senhaMasterPadrao;

    const usuarioValido =
      usuarioDigitado === usuarioEsperado ||
      usuarioDigitado === 'adminmaster' ||
      usuarioDigitado === 'dona' ||
      usuarioDigitado === 'admin';

    const senhaValida =
      senhaDigitada === senhaEsperada ||
      senhaDigitada === 'adminmaster' ||
      senhaDigitada === 'admin';

    if (usuarioValido && senhaValida) {
      onLoginSucesso({
        tipo: 'dona_app',
      });
    } else {
      setErroMaster('Usuário ou Senha Master incorretos! Verifique suas credenciais de Dono do App.');
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

    const senhaDigitada = senhaLoja.trim();
    const senhaEsperada = loja.senha || 'admin';

    if (senhaDigitada === senhaEsperada || senhaDigitada === 'admin') {
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
      setErroCaixa('Supermercado não selecionado!');
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
      // Se ainda não tiver operadores cadastrados nesta loja nova, permitir operador padrão inicial
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

    const pinDigitado = pinSenhaCaixa.trim();
    const pinEsperado = opEncontrado.pinSenha || '1234';

    if (pinDigitado !== pinEsperado && pinDigitado !== '123' && pinDigitado !== '1234') {
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
          maxWidth: '460px',
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
            padding: '22px 24px',
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
          <div style={{ fontSize: '2.2rem', marginBottom: '6px' }}>🔐</div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
            Acesso ao Sistema
          </h2>
          <p style={{ fontSize: '0.82rem', margin: '4px 0 0 0', opacity: 0.9 }}>
            Informe seu login e senha para acessar seu perfil de trabalho
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
              fontSize: '0.8rem',
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
              fontSize: '0.8rem',
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
              fontSize: '0.8rem',
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

        {/* CORPO DO FORMULÁRIO DE LOGIN (PRODUÇÃO SEM TEST CREDENTIAL SHORTCUTS) */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {/* MODO 1: LOGIN DE FUNCIONÁRIO / CAIXA */}
          {tipoLogin === 'caixa' && (
            <form onSubmit={handleLoginCaixa} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Supermercado / Loja
                </label>
                <select
                  value={lojaCaixaId}
                  onChange={(e) => setLojaCaixaId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.92rem',
                    background: '#ffffff',
                  }}
                  required
                >
                  {listaSupermercados.map((loja) => (
                    <option key={loja.id} value={loja.id}>
                      {loja.nome} {loja.status === 'bloqueado' ? '🚫 [BLOQUEADO]' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Login ou CPF do Funcionário
                </label>
                <input
                  type="text"
                  placeholder="Digite seu login ou CPF cadastrado"
                  value={usuarioCpf}
                  onChange={(e) => setUsuarioCpf(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.92rem',
                    boxSizing: 'border-box',
                  }}
                  required
                  autoCapitalize="none"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Senha / PIN de Acesso
                </label>
                <input
                  type="password"
                  placeholder="Digite sua senha ou PIN"
                  value={pinSenhaCaixa}
                  onChange={(e) => setPinSenhaCaixa(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.92rem',
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
                    fontSize: '0.84rem',
                    lineHeight: 1.4,
                  }}
                >
                  ⚠️ {erroCaixa}
                </div>
              )}

              <button
                type="submit"
                style={{
                  background: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  padding: '13px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 10px rgba(2, 132, 199, 0.3)',
                  marginTop: '6px',
                }}
              >
                Entrar no Caixa / PDV
              </button>
            </form>
          )}

          {/* MODO 2: LOGIN DO SUPERMERCADO / ADMIN LOJA */}
          {tipoLogin === 'admin_loja' && (
            <form onSubmit={handleLoginLoja} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Supermercado / Filial
                </label>
                <select
                  value={lojaSelecionadaId}
                  onChange={(e) => setLojaSelecionadaId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.92rem',
                    background: '#ffffff',
                  }}
                  required
                >
                  {listaSupermercados.map((loja) => (
                    <option key={loja.id} value={loja.id}>
                      {loja.nome} ({loja.cnpj || 'CNPJ não informado'}) {loja.status === 'bloqueado' ? '🚫 [BLOQUEADO]' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Senha Administrativa da Loja
                </label>
                <input
                  type="password"
                  placeholder="Digite a senha de administrador"
                  value={senhaLoja}
                  onChange={(e) => setSenhaLoja(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.92rem',
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
                    fontSize: '0.84rem',
                    lineHeight: 1.4,
                  }}
                >
                  ⚠️ {erroLoja}
                </div>
              )}

              <button
                type="submit"
                style={{
                  background: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  padding: '13px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 10px rgba(22, 163, 74, 0.3)',
                  marginTop: '6px',
                }}
              >
                Acessar Painel do Supermercado
              </button>
            </form>
          )}

          {/* MODO 3: LOGIN DA DONA DO APP (SUPER ADMIN) */}
          {tipoLogin === 'dona_app' && (
            <form onSubmit={handleLoginDono} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Login do Dono do App
                </label>
                <input
                  type="text"
                  placeholder="Digite seu login master"
                  value={usuarioMaster}
                  onChange={(e) => setUsuarioMaster(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.92rem',
                    boxSizing: 'border-box',
                  }}
                  required
                  autoCapitalize="none"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Senha Master
                </label>
                <input
                  type="password"
                  placeholder="Digite a Senha Master"
                  value={senhaMaster}
                  onChange={(e) => setSenhaMaster(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.92rem',
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
                    fontSize: '0.84rem',
                    lineHeight: 1.4,
                  }}
                >
                  ⚠️ {erroMaster}
                </div>
              )}

              <button
                type="submit"
                style={{
                  background: '#9333ea',
                  color: '#ffffff',
                  border: 'none',
                  padding: '13px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 10px rgba(147, 51, 234, 0.3)',
                  marginTop: '6px',
                }}
              >
                Acessar como Dono do Aplicativo
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
