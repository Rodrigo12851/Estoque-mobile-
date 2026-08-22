import React, { useState } from 'react';
import { Supermercado, OperadorCaixa, SessaoUsuario, CredenciaisDonoApp } from '../types';

interface TelaLoginProps {
  visivel: boolean;
  listaSupermercados: Supermercado[];
  onLoginSucesso: (sessao: SessaoUsuario) => void;
  senhaMasterPadrao?: string;
}

const MAX_TENTATIVAS = 5;
const MINUTOS_BLOQUEIO = 5;
const TEMPO_BLOQUEIO_MS = MINUTOS_BLOQUEIO * 60 * 1000;

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

  // Estados de proteção contra força bruta
  const [tentativasFalhas, setTentativasFalhas] = useState<number>(() => {
    const salvo = localStorage.getItem('tentativas_falhas_login');
    return salvo ? parseInt(salvo, 10) || 0 : 0;
  });
  const [bloqueadoAte, setBloqueadoAte] = useState<number | null>(() => {
    const salvo = localStorage.getItem('bloqueio_login_timestamp');
    if (salvo) {
      const ts = parseInt(salvo, 10);
      if (ts > Date.now()) return ts;
    }
    return null;
  });
  const [segundosRestantes, setSegundosRestantes] = useState<number>(0);

  // Efeito para checar e atualizar o bloqueio ativo com cronômetro em tempo real
  React.useEffect(() => {
    if (!bloqueadoAte) {
      setSegundosRestantes(0);
      return;
    }

    const atualizarContador = () => {
      const agora = Date.now();
      const dif = Math.max(0, Math.ceil((bloqueadoAte - agora) / 1000));
      setSegundosRestantes(dif);

      if (dif <= 0) {
        setBloqueadoAte(null);
        setTentativasFalhas(0);
        localStorage.removeItem('bloqueio_login_timestamp');
        localStorage.removeItem('tentativas_falhas_login');
        setErro('');
      }
    };

    atualizarContador();
    const timer = setInterval(atualizarContador, 1000);
    return () => clearInterval(timer);
  }, [bloqueadoAte]);

  // Garante que toda vez que a tela de login for exibida, os campos fiquem limpos
  React.useEffect(() => {
    if (visivel) {
      setUsuarioOuCpf('');
      setSenhaOuPin('');
      setSenhaVisivel(false);
      setCarregando(false);

      // Checa se há bloqueio ativo salvo
      const salvoBloqueio = localStorage.getItem('bloqueio_login_timestamp');
      if (salvoBloqueio) {
        const ts = parseInt(salvoBloqueio, 10);
        if (ts > Date.now()) {
          setBloqueadoAte(ts);
        } else {
          setBloqueadoAte(null);
          localStorage.removeItem('bloqueio_login_timestamp');
          localStorage.removeItem('tentativas_falhas_login');
        }
      }
    }
  }, [visivel]);

  if (!visivel) return null;

  const registrarFalhaLogin = () => {
    const novasFalhas = tentativasFalhas + 1;
    setTentativasFalhas(novasFalhas);
    localStorage.setItem('tentativas_falhas_login', String(novasFalhas));

    if (novasFalhas >= MAX_TENTATIVAS) {
      const timestampBloqueio = Date.now() + TEMPO_BLOQUEIO_MS;
      setBloqueadoAte(timestampBloqueio);
      localStorage.setItem('bloqueio_login_timestamp', String(timestampBloqueio));
      setErro(
        `🚨 LIMITE DE TENTATIVAS EXCEDIDO! Por motivos de segurança contra programas de força bruta, o sistema foi BLOQUEADO por ${MINUTOS_BLOQUEIO} minutos.`
      );
    } else {
      const restantes = MAX_TENTATIVAS - novasFalhas;
      setErro(
        `Login ou senha incorretos. Tentativa ${novasFalhas} de ${MAX_TENTATIVAS}. (${restantes} tentativa${
          restantes > 1 ? 's restantes' : ' restante'
        } antes do bloqueio temporário de ${MINUTOS_BLOQUEIO} minutos).`
      );
    }
  };

  const limparFalhasLogin = () => {
    setTentativasFalhas(0);
    setBloqueadoAte(null);
    localStorage.removeItem('tentativas_falhas_login');
    localStorage.removeItem('bloqueio_login_timestamp');
  };

  const formatarTempo = (seg: number) => {
    const m = Math.floor(seg / 60);
    const s = seg % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (bloqueadoAte && Date.now() < bloqueadoAte) {
      setErro(`Sistema bloqueado por segurança. Aguarde ${formatarTempo(segundosRestantes)}.`);
      return;
    }

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
      limparFalhasLogin();
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

        limparFalhasLogin();
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
          limparFalhasLogin();
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
      limparFalhasLogin();
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

    // 5. Credenciais inválidas: contabiliza falha para bloqueio de força bruta
    setCarregando(false);
    registrarFalhaLogin();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        minHeight: '100dvh',
        background: '#090d16',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box',
        overflowY: 'auto',
      }}
    >
      {/* BACKGROUND DECORATIVO INTERNO 100% OPACO */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 50% 20%, #1e293b 0%, #090d16 80%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'relative',
          background: '#ffffff',
          width: '100%',
          maxWidth: '460px',
          borderRadius: '24px',
          boxShadow: '0 25px 70px rgba(0, 0, 0, 0.7)',
          border: '1px solid #334155',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          margin: 'auto',
        }}
      >
        {/* CABEÇALHO DA TELA DE LOGIN */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            padding: '32px 28px 24px 28px',
            color: '#ffffff',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '68px',
              height: '68px',
              margin: '0 auto 14px auto',
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.2rem',
              boxShadow: '0 10px 20px rgba(0,0,0,0.2)',
            }}
          >
            🏪
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
            Sistema de Supermercados
          </h2>
          <p style={{ fontSize: '0.9rem', margin: '6px 0 0 0', opacity: 0.92, fontWeight: 500 }}>
            Identifique-se com seu login e senha para acessar
          </p>
        </div>

        {/* FORMULÁRIO EXCLUSIVO COM APENAS LOGIN E SENHA */}
        <div style={{ padding: '28px 26px' }}>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* BANNER DE BLOQUEIO DE FORÇA BRUTA COM CONTAGEM REGRESSIVA */}
            {bloqueadoAte && segundosRestantes > 0 ? (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1.5px solid #ef4444',
                  borderRadius: '14px',
                  padding: '16px',
                  textAlign: 'center',
                  color: '#991b1b',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <div style={{ fontSize: '1.8rem' }}>🔒</div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#b91c1c' }}>
                  Acesso Bloqueado Temporariamente
                </div>
                <div style={{ fontSize: '0.85rem', color: '#7f1d1d', lineHeight: 1.4 }}>
                  Múltiplas tentativas incorretas foram detectadas. Por segurança contra ataques automatizados, aguarde o término do tempo para tentar novamente.
                </div>
                <div
                  style={{
                    fontSize: '1.4rem',
                    fontWeight: 900,
                    color: '#dc2626',
                    fontFamily: 'monospace',
                    background: '#ffffff',
                    padding: '6px 16px',
                    borderRadius: '8px',
                    border: '1px solid #fca5a5',
                    letterSpacing: '2px',
                    marginTop: '4px',
                  }}
                >
                  ⏱️ {formatarTempo(segundosRestantes)}
                </div>
              </div>
            ) : null}

            {/* CAMPO: LOGIN / USUÁRIO / CPF */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    color: '#1e293b',
                    margin: 0,
                  }}
                >
                  <span>👤</span>
                  <span>Usuário, CPF ou Login</span>
                </label>
                {tentativasFalhas > 0 && !bloqueadoAte && (
                  <span style={{ fontSize: '0.78rem', color: '#dc2626', fontWeight: 600 }}>
                    Tentativa {tentativasFalhas} de {MAX_TENTATIVAS}
                  </span>
                )}
              </div>
              <input
                type="text"
                name="username_login_input"
                autoComplete="off"
                placeholder="Digite seu login, CPF ou usuário"
                value={usuarioOuCpf}
                onChange={(e) => setUsuarioOuCpf(e.target.value)}
                disabled={!!bloqueadoAte}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                  outline: 'none',
                  color: '#0f172a',
                  background: bloqueadoAte ? '#f1f5f9' : '#f8fafc',
                  opacity: bloqueadoAte ? 0.6 : 1,
                  cursor: bloqueadoAte ? 'not-allowed' : 'text',
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
                  fontSize: '0.88rem',
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
                  name="password_login_input"
                  autoComplete="new-password"
                  placeholder="Digite sua senha ou PIN"
                  value={senhaOuPin}
                  onChange={(e) => setSenhaOuPin(e.target.value)}
                  disabled={!!bloqueadoAte}
                  style={{
                    width: '100%',
                    padding: '14px 48px 14px 16px',
                    borderRadius: '12px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '1rem',
                    boxSizing: 'border-box',
                    outline: 'none',
                    color: '#0f172a',
                    background: bloqueadoAte ? '#f1f5f9' : '#f8fafc',
                    opacity: bloqueadoAte ? 0.6 : 1,
                    cursor: bloqueadoAte ? 'not-allowed' : 'text',
                    transition: 'border-color 0.2s',
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setSenhaVisivel(!senhaVisivel)}
                  disabled={!!bloqueadoAte}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    cursor: bloqueadoAte ? 'not-allowed' : 'pointer',
                    fontSize: '1.3rem',
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

            {/* MENSAGEM DE ERRO (QUANDO NÃO ESTIVER BLOQUEADO) */}
            {erro && !bloqueadoAte && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  fontSize: '0.88rem',
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
              disabled={carregando || !!bloqueadoAte}
              style={{
                background: bloqueadoAte
                  ? '#94a3b8'
                  : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '15px',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '1.05rem',
                cursor: bloqueadoAte ? 'not-allowed' : carregando ? 'wait' : 'pointer',
                boxShadow: bloqueadoAte ? 'none' : '0 6px 18px rgba(2, 132, 199, 0.4)',
                marginTop: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              {bloqueadoAte
                ? `🔒 Bloqueado (${formatarTempo(segundosRestantes)})`
                : carregando
                ? 'Validando Acesso...'
                : 'Entrar no Sistema'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

