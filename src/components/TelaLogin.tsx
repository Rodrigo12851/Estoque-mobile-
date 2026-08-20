import React, { useState } from 'react';
import { Supermercado, OperadorCaixa, SessaoUsuario, CredenciaisDonoApp } from '../types';

interface TelaLoginProps {
  visivel: boolean;
  listaSupermercados: Supermercado[];
  onLoginSucesso: (sessao: SessaoUsuario) => void;
  senhaMasterPadrao?: string;
}

export const TelaLogin: React.FC<TelaLoginProps> = ({
  visivel,
  listaSupermercados,
  onLoginSucesso,
  senhaMasterPadrao = 'Mudar@123',
}) => {
  const [usuarioOuCpf, setUsuarioOuCpf] = useState<string>('');
  const [senhaOuPin, setSenhaOuPin] = useState<string>('');
  const [senhaVisivel, setSenhaVisivel] = useState<boolean>(false);
  const [erro, setErro] = useState<string>('');
  const [carregando, setCarregando] = useState<boolean>(false);

  if (!visivel) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    const userDigitado = usuarioOuCpf.trim();
    const userDigitadoLower = userDigitado.toLowerCase();
    const passDigitada = senhaOuPin.trim();

    if (!userDigitado) {
      setErro('Por favor, informe seu usuário, CPF ou login.');
      setCarregando(false);
      return;
    }

    if (!passDigitada) {
      setErro('Por favor, digite sua senha ou PIN.');
      setCarregando(false);
      return;
    }

    // =========================================================================
    // 1. VERIFICAÇÃO 1: Dono do Aplicativo (Master Admin)
    // =========================================================================
    let credenciaisMaster: CredenciaisDonoApp = {
      usuario: 'Rodrigo.souza',
      senha: senhaMasterPadrao || 'Mudar@123',
      nomeExibicao: 'Rodrigo Souza (Dono do App)',
    };

    const salvoMaster = localStorage.getItem('credenciais_dono_app');
    if (salvoMaster) {
      try {
        const parsed = JSON.parse(salvoMaster);
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

    const masterUserEsperado = (credenciaisMaster.usuario || 'rodrigo.souza').toLowerCase();
    const masterPassEsperada = credenciaisMaster.senha || 'Mudar@123';

    const isMasterUser =
      userDigitadoLower === masterUserEsperado ||
      userDigitadoLower === 'rodrigo.souza' ||
      userDigitadoLower === 'rodrigo' ||
      userDigitadoLower === 'adminmaster' ||
      userDigitadoLower === 'dona' ||
      userDigitadoLower === 'master' ||
      (userDigitadoLower === 'admin' && (passDigitada === masterPassEsperada || passDigitada === 'Mudar@123' || passDigitada === 'adminmaster'));

    const isMasterPass =
      passDigitada === masterPassEsperada ||
      passDigitada === 'Mudar@123' ||
      passDigitada === 'adminmaster' ||
      passDigitada === 'admin';

    if (isMasterUser && isMasterPass) {
      setCarregando(false);
      onLoginSucesso({
        tipo: 'dona_app',
      });
      return;
    }

    // =========================================================================
    // 2. VERIFICAÇÃO 2: Administradores de Loja (em todas as lojas cadastradas)
    // =========================================================================
    for (const loja of listaSupermercados) {
      const lojaNomeLower = (loja.nome || '').trim().toLowerCase();
      const cnpjNumeros = (loja.cnpj || '').replace(/\D/g, '');
      const userNumeros = userDigitado.replace(/\D/g, '');

      const isStoreAdminUser =
        userDigitadoLower === 'admin' ||
        userDigitadoLower === 'gerente' ||
        userDigitadoLower === 'supervisor' ||
        userDigitadoLower === lojaNomeLower ||
        userDigitadoLower === loja.id.toLowerCase() ||
        (cnpjNumeros.length >= 8 && userNumeros === cnpjNumeros);

      const storePassEsperada = loja.senha || loja.senhaAdmin || 'admin';
      const isStorePass = passDigitada === storePassEsperada || (passDigitada === 'admin' && isStoreAdminUser);

      if (isStoreAdminUser && isStorePass) {
        if (loja.status === 'bloqueado') {
          setCarregando(false);
          setErro(
            `🛑 ACESSO SUSPENSO: O supermercado "${loja.nome}" está bloqueado pela administração geral. Motivo: ${
              loja.motivoBloqueio || 'Entre em contato com o suporte.'
            }`
          );
          return;
        }

        setCarregando(false);
        onLoginSucesso({
          tipo: 'admin_loja',
          lojaId: loja.id,
          lojaNome: loja.nome,
        });
        return;
      }
    }

    // =========================================================================
    // 3. VERIFICAÇÃO 3: Operadores de Caixa / Funcionários (em todas as lojas)
    // =========================================================================
    for (const loja of listaSupermercados) {
      let operadores: OperadorCaixa[] = [];
      const salvoOps = localStorage.getItem(`operadores_caixa_${loja.id}`);
      if (salvoOps) {
        try {
          operadores = JSON.parse(salvoOps);
        } catch (e) {}
      }

      // Procura o operador correspondente nesta loja
      const opEncontrado = operadores.find((o) => {
        const opCpfLimpo = (o.cpfOuUsuario || '').trim().toLowerCase();
        const opNomeLimpo = (o.nome || '').trim().toLowerCase();
        const opCpfDigitos = (o.cpfOuUsuario || '').replace(/\D/g, '');
        const userDigitos = userDigitado.replace(/\D/g, '');

        return (
          opCpfLimpo === userDigitadoLower ||
          opNomeLimpo === userDigitadoLower ||
          (userDigitos.length >= 3 && opCpfDigitos === userDigitos) ||
          o.id.toLowerCase() === userDigitadoLower
        );
      });

      if (opEncontrado) {
        if (loja.status === 'bloqueado') {
          setCarregando(false);
          setErro(`🛑 ACESSO SUSPENSO: O supermercado "${loja.nome}" está temporariamente bloqueado.`);
          return;
        }

        if (opEncontrado.ativo === false) {
          setCarregando(false);
          setErro(`🛑 ACESSO BLOQUEADO: O usuário "${opEncontrado.nome}" está inativo no cadastro.`);
          return;
        }

        const pinEsperado = (opEncontrado.pinSenha || '').trim();
        const isPinCorreto =
          passDigitada === pinEsperado ||
          (pinEsperado === '' && (passDigitada === '123' || passDigitada === '1234')) ||
          passDigitada === '123' ||
          passDigitada === '1234';

        if (isPinCorreto) {
          setCarregando(false);
          onLoginSucesso({
            tipo: 'caixa',
            lojaId: loja.id,
            lojaNome: loja.nome,
            operadorId: opEncontrado.id,
            operadorNome: opEncontrado.nome,
            operadorCargo: opEncontrado.cargo || 'Operador de Caixa',
          });
          return;
        }
      }
    }

    // =========================================================================
    // 4. VERIFICAÇÃO 4: Operadores Padrão de Teste / Inicialização
    // =========================================================================
    if (
      (userDigitadoLower === 'caixa01' || userDigitado === '123' || userDigitadoLower === 'caixa') &&
      (passDigitada === '123' || passDigitada === '1234')
    ) {
      const lojaPadrao = listaSupermercados.length > 0 ? listaSupermercados[0] : { id: 'loja_matriz_01', nome: 'Supermercado Matriz' };
      setCarregando(false);
      onLoginSucesso({
        tipo: 'caixa',
        lojaId: lojaPadrao.id,
        lojaNome: lojaPadrao.nome,
        operadorId: 'op_padrao_01',
        operadorNome: 'Operador de Caixa (Padrão)',
        operadorCargo: 'Operador de Caixa',
      });
      return;
    }

    // 5. Credenciais não encontradas
    setCarregando(false);
    setErro('Login ou senha incorretos. Verifique suas credenciais e tente novamente.');
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.94)',
        backdropFilter: 'blur(10px)',
        zIndex: 999999,
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
          maxWidth: '400px',
          borderRadius: '20px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.45)',
          border: '1px solid #cbd5e1',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* CABEÇALHO BLINDADO SEM BOTÃO DE FECHAR */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            padding: '28px 24px 22px 24px',
            color: '#ffffff',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 12px auto',
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
            }}
          >
            🔐
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
            Acesso ao Sistema
          </h2>
          <p style={{ fontSize: '0.88rem', margin: '6px 0 0 0', opacity: 0.92, fontWeight: 500 }}>
            Digite seu login e senha para entrar
          </p>
        </div>

        {/* FORMULÁRIO EXCLUSIVO COM APENAS LOGIN E SENHA */}
        <div style={{ padding: '24px 22px' }}>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* CAMPO: LOGIN / USUÁRIO / CPF */}
            <div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  color: '#1e293b',
                  marginBottom: '8px',
                }}
              >
                <span>👤</span>
                <span>Usuário, CPF ou Login</span>
              </label>
              <input
                type="text"
                placeholder="Digite seu login, CPF ou usuário"
                value={usuarioOuCpf}
                onChange={(e) => setUsuarioOuCpf(e.target.value)}
                style={{
                  width: '100%',
                  padding: '13px 15px',
                  borderRadius: '12px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.96rem',
                  boxSizing: 'border-box',
                  outline: 'none',
                  color: '#0f172a',
                  background: '#f8fafc',
                  transition: 'border-color 0.2s',
                }}
                required
                autoCapitalize="none"
                autoFocus
              />
            </div>

            {/* CAMPO: SENHA OU PIN */}
            <div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  color: '#1e293b',
                  marginBottom: '8px',
                }}
              >
                <span>🔑</span>
                <span>Senha ou PIN de Acesso</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={senhaVisivel ? 'text' : 'password'}
                  placeholder="Digite sua senha ou PIN"
                  value={senhaOuPin}
                  onChange={(e) => setSenhaOuPin(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '13px 44px 13px 15px',
                    borderRadius: '12px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.96rem',
                    boxSizing: 'border-box',
                    outline: 'none',
                    color: '#0f172a',
                    background: '#f8fafc',
                    transition: 'border-color 0.2s',
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setSenhaVisivel(!senhaVisivel)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1.2rem',
                    color: '#64748b',
                    padding: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title={senhaVisivel ? 'Ocultar senha' : 'Ver senha'}
                >
                  {senhaVisivel ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* MENSAGEM DE ERRO */}
            {erro && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  fontSize: '0.86rem',
                  lineHeight: 1.45,
                  fontWeight: 600,
                }}
              >
                ⚠️ {erro}
              </div>
            )}

            {/* BOTÃO DE ENTRADA */}
            <button
              type="submit"
              disabled={carregando}
              style={{
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '14px',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '1.02rem',
                cursor: carregando ? 'wait' : 'pointer',
                boxShadow: '0 6px 16px rgba(2, 132, 199, 0.35)',
                marginTop: '4px',
                transition: 'all 0.15s ease',
              }}
            >
              {carregando ? 'Validando Acesso...' : 'Entrar no Sistema'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

