import React, { useState } from 'react';
import { PermissoesOperador, PermissoesLoja, SessaoUsuario } from '../types';

interface ManualUsuarioModalProps {
  visivel: boolean;
  onFechar: () => void;
  perfilAtivo?: 'dona_app' | 'admin_loja' | 'caixa';
  sessao?: SessaoUsuario | null;
  permissoesOperador?: PermissoesOperador;
  permissoesLoja?: PermissoesLoja;
  nomeLoja?: string;
  nomeOperador?: string;
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
  perfilAtivo,
  sessao,
  permissoesOperador,
  permissoesLoja,
  nomeLoja,
  nomeOperador,
}) => {
  const [termoBusca, setTermoBusca] = useState('');
  const [topicoSelecionadoId, setTopicoSelecionadoId] = useState<string>('');

  if (!visivel) return null;

  const tipoUsuario = perfilAtivo || sessao?.tipo || 'caixa';
  const isDono = tipoUsuario === 'dona_app';
  const isAdminLoja = tipoUsuario === 'admin_loja';
  const isCaixa = tipoUsuario === 'caixa' || (!isDono && !isAdminLoja);

  const topicos: TopicoManual[] = [];

  // =========================================================================
  // 1. FRENTE DE CAIXA (PDV COMPLETO)
  // =========================================================================
  topicos.push({
    id: 'pdv_vendas',
    icone: '🛒',
    titulo: 'Frente de Caixa & Registro de Vendas',
    categoria: 'Frente de Caixa (PDV)',
    conteudo: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '10px', padding: '12px 14px', color: '#0369a1', fontSize: '0.9rem' }}>
          💡 <strong>Visão Geral:</strong> O PDV foi desenvolvido para garantir agilidade máxima nas filas, funcionando perfeitamente em computadores, tablets ou celulares, com ou sem leitor físico.
        </div>

        <h4 style={{ margin: '8px 0 4px 0', fontSize: '1rem', color: '#0f172a' }}>1. Como Adicionar Produtos à Compra</h4>
        <ul style={{ paddingLeft: '20px', lineHeight: 1.6, margin: 0 }}>
          <li><strong>Leitor de Código de Barras (USB / Bluetooth):</strong> Mantenha o cursor no campo de código de barras. Ao bipar o produto, ele é adicionado instantaneamente ao carrinho com foto, preço e estoque atualizado.</li>
          <li><strong>Câmera do Celular / Tablet:</strong> Toque no ícone de câmera (📷) ao lado do campo para usar a câmera do dispositivo como leitor óptico de código de barras.</li>
          <li><strong>Busca Rápida por Nome:</strong> Digite parte do nome, marca ou categoria do produto (ex: "arroz", "leite", "coca") e clique no item na lista.</li>
          <li><strong>Produtos de Balança / Pesáveis (KG):</strong> O sistema lê automaticamente as etiquetas de balança (padrão EAN-13 iniciado em 2), extraindo o código interno do produto e o peso/valor final com precisão de gramas.</li>
        </ul>

        <h4 style={{ margin: '8px 0 4px 0', fontSize: '1rem', color: '#0f172a' }}>2. Multiplicação de Quantidades e Descontos</h4>
        <ul style={{ paddingLeft: '20px', lineHeight: 1.6, margin: 0 }}>
          <li><strong>Multiplicar Quantidade:</strong> Você pode ajustar a quantidade no próprio carrinho usando os botões <strong>[+]</strong> e <strong>[-]</strong>, ou digitar a quantidade diretamente.</li>
          <li><strong>Remover Item:</strong> Clique na lixeira 🗑️ ao lado do produto no carrinho caso o cliente desista da compra.</li>
          <li><strong>Descontos:</strong> Se o seu usuário possuir permissão concedida pela gerência, é possível aplicar descontos em percentual (%) ou valor em reais (R$) no total da venda.</li>
        </ul>
      </div>
    ),
  });

  topicos.push({
    id: 'formas_pagamento',
    icone: '💳',
    titulo: 'Formas de Pagamento, Troco & Cupom',
    categoria: 'Frente de Caixa (PDV)',
    conteudo: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', color: '#0f172a' }}>Finalização de Vendas</h4>
        <p style={{ margin: 0, lineHeight: 1.6 }}>
          Ao clicar em <strong>"Finalizar Venda"</strong>, escolha a forma de pagamento combinada com o cliente:
        </p>
        <ul style={{ paddingLeft: '20px', lineHeight: 1.6, margin: 0 }}>
          <li><strong>💵 Dinheiro:</strong> Digite o valor entregue pelo cliente em cédulas/moedas. O sistema calcula automaticamente o <em>Troco Exato</em> na tela em destaque verde.</li>
          <li><strong>⚡ PIX Instantâneo:</strong> A tela apresenta o valor exato a ser cobrado. O operador confere o comprovante no aplicativo do banco antes de confirmar.</li>
          <li><strong>💳 Cartão de Crédito e Débito:</strong> Passe o valor na maquininha física da sua loja e confirme a transação no PDV.</li>
          <li><strong>📖 Fiado / Caderneta:</strong> Permite vincular a compra à conta corrente de um cliente previamente cadastrado.</li>
        </ul>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
          <strong style={{ color: '#0f172a' }}>📄 Emissão e Impressão de Cupom:</strong>
          <p style={{ margin: '6px 0 0 0', fontSize: '0.88rem', color: '#475569', lineHeight: 1.5 }}>
            Após concluir a venda, o cupom é gerado com os itens, total, troco e identificação do supermercado. É possível <strong>Imprimir em Impressora Térmica (58mm/80mm)</strong>, salvar em <strong>PDF</strong> ou enviar o comprovante diretamente para o <strong>WhatsApp</strong> do cliente.
          </p>
        </div>
      </div>
    ),
  });

  // =========================================================================
  // 2. GESTÃO DE CAIXA E TURNOS
  // =========================================================================
  if (!isCaixa || permissoesOperador?.gestao_caixa !== false) {
    topicos.push({
      id: 'gestao_caixa_turno',
      icone: '💵',
      titulo: 'Abertura, Sangria e Fechamento de Caixa',
      categoria: 'Gestão Financeira & Caixa',
      conteudo: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px 14px', color: '#166534', fontSize: '0.9rem' }}>
            🔒 <strong>Segurança Financeira:</strong> Cada operador possui seu turno isolado. O sistema bloqueia a saída do operador se o caixa estiver aberto para evitar quebras ou erros na gaveta.
          </div>

          <h4 style={{ margin: '4px 0 0 0', fontSize: '1rem', color: '#0f172a' }}>Passo a Passo do Turno:</h4>
          <ol style={{ paddingLeft: '20px', lineHeight: 1.6, margin: 0 }}>
            <li><strong>Abertura de Caixa:</strong> Informe a quantia do <em>Fundo de Troco Inicial</em> que está fisicamente na gaveta e confirme com sua senha.</li>
            <li><strong>Sangria (Retirada de Dinheiro):</strong> Quando houver excesso de notas na gaveta, lance uma sangria especificando o valor e o destino (ex: "Envio ao cofre da gerência").</li>
            <li><strong>Suprimento (Entrada de Troco):</strong> Use para registrar moedas ou notas adicionais fornecidas pelo gerente durante o dia.</li>
            <li><strong>Fechamento de Caixa (Conferência Cega):</strong> No encerramento do expediente, conte fisicamente as notas, comprovantes de cartão e PIX. Digite os valores conferidos. O sistema compara o valor teórico com o valor físico e gera o relatório completo de fechamento.</li>
          </ol>
        </div>
      ),
    });
  }

  // =========================================================================
  // 3. CONTROLE DE ESTOQUE, LOTES E VALIDADES
  // =========================================================================
  if (!isCaixa || permissoesOperador?.cadastrar_produtos !== false || permissoesOperador?.baixa_estoque !== false) {
    topicos.push({
      id: 'estoque_lotes_validades',
      icone: '📦',
      titulo: 'Estoque, Lotes, Validades & Baixas de Perdas',
      categoria: 'Estoque & Mercadorias',
      conteudo: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', color: '#0f172a' }}>1. Cadastro e Entrada de Produtos</h4>
          <p style={{ margin: 0, lineHeight: 1.6 }}>
            No módulo de <strong>Estoque</strong>, você cadastra o produto com código de barras EAN, nome, categoria, preço de custo, preço de venda e margem de lucro calculada em tempo real.
          </p>
          <ul style={{ paddingLeft: '20px', lineHeight: 1.6, margin: 0 }}>
            <li><strong>Múltiplos Lotes:</strong> O mesmo produto pode ter lotes diferentes com datas de validade distintas.</li>
            <li><strong>Estoque Mínimo:</strong> Defina o estoque de segurança para receber alertas de reposição antes que o item se esgote.</li>
          </ul>

          <h4 style={{ margin: '8px 0 4px 0', fontSize: '1rem', color: '#0f172a' }}>2. Alertas de Validade Próxima (Evite Prejuízos!)</h4>
          <p style={{ margin: 0, lineHeight: 1.6 }}>
            O painel de validades sinaliza automaticamente com cores os produtos a vencer em:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
              <span style={{ color: '#dc2626', fontWeight: 800 }}>🚨 Até 15 Dias</span>
              <div style={{ fontSize: '0.78rem', color: '#991b1b', marginTop: '2px' }}>Ação Urgente / Promoção</div>
            </div>
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
              <span style={{ color: '#d97706', fontWeight: 800 }}>⚠️ Até 30 Dias</span>
              <div style={{ fontSize: '0.78rem', color: '#92400e', marginTop: '2px' }}>Atenção / Reposicionamento</div>
            </div>
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
              <span style={{ color: '#2563eb', fontWeight: 800 }}>📅 Até 60 Dias</span>
              <div style={{ fontSize: '0.78rem', color: '#1e40af', marginTop: '2px' }}>Planejamento de Vendas</div>
            </div>
          </div>

          <h4 style={{ margin: '8px 0 4px 0', fontSize: '1rem', color: '#0f172a' }}>3. Baixa Oficial de Perdas e Avarias</h4>
          <p style={{ margin: 0, lineHeight: 1.6 }}>
            Quando um item vencer ou quebrar na loja, acesse <strong>"Baixa de Estoque"</strong>, selecione o produto, a quantidade e o motivo (ex: <em>"Produto Vencido"</em>, <em>"Embalagem Avariada"</em>, <em>"Consumo Interno"</em>). A mercadoria sai do estoque e é registrada no balanço de perdas para fins fiscais e gerenciais.
          </p>
        </div>
      ),
    });
  }

  // =========================================================================
  // 4. CADERNETA DE FIADO (CLIENTES DEVEDORES)
  // =========================================================================
  if (!isCaixa || permissoesOperador?.gerenciar_devedores !== false) {
    topicos.push({
      id: 'fiado_devedores',
      icone: '📖',
      titulo: 'Caderneta Digital de Fiado & Cobrança WhatsApp',
      categoria: 'Clientes & Fiado',
      conteudo: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', color: '#0f172a' }}>Gestão de Contas a Receber</h4>
          <p style={{ margin: 0, lineHeight: 1.6 }}>
            Substitua os velhos cadernos de papel por um controle digital seguro e blindado contra erros:
          </p>
          <ul style={{ paddingLeft: '20px', lineHeight: 1.6, margin: 0 }}>
            <li><strong>Cadastro de Cliente:</strong> Registre Nome, Telefone/WhatsApp, CPF, Endereço e o <em>Limite de Crédito</em> autorizado para compras a prazo.</li>
            <li><strong>Lançar Venda no Fiado:</strong> No PDV, ao escolher forma de pagamento "Fiado", selecione o cliente. O saldo devedor é atualizado imediatamente.</li>
            <li><strong>Baixa de Pagamentos:</strong> Quando o cliente for pagar, clique em <strong>"Registrar Pagamento"</strong>. Digite o valor recebido (integral ou parcial). O saldo restante é recalculado na hora.</li>
            <li><strong>📲 Lembrete Amigável por WhatsApp:</strong> Clique no botão do WhatsApp ao lado do cliente para enviar uma mensagem educada com o extrato das compras e o saldo atualizado.</li>
          </ul>
        </div>
      ),
    });
  }

  // =========================================================================
  // 5. IMPRESSÃO DE ETIQUETAS DE GÔNDOLA
  // =========================================================================
  if (!isCaixa || permissoesOperador?.imprimir_etiquetas !== false) {
    topicos.push({
      id: 'etiquetas_gondola',
      icone: '🏷️',
      titulo: 'Impressão de Etiquetas de Gôndola & Prateleira',
      categoria: 'Etiquetas & Preços',
      conteudo: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', color: '#0f172a' }}>Padronização Visual das Prateleiras</h4>
          <p style={{ margin: 0, lineHeight: 1.6 }}>
            O gerador de etiquetas permite imprimir os preços atualizados para as gôndolas da loja:
          </p>
          <ul style={{ paddingLeft: '20px', lineHeight: 1.6, margin: 0 }}>
            <li><strong>Modelos Disponíveis:</strong> Etiqueta Pequena para prateleira, Etiqueta Média com Código de Barras e Cartaz de Oferta / Destaque.</li>
            <li><strong>Seleção de Produtos:</strong> Escolha produtos individualmente, filtre por categoria ou selecione os itens que tiveram alteração recente de preço.</li>
            <li><strong>Compatibilidade:</strong> Funciona com qualquer impressora comum (folha A4 adesiva Pimaco) ou impressoras térmicas de etiqueta (Zebra, Elgin, Argox).</li>
          </ul>
        </div>
      ),
    });
  }

  // =========================================================================
  // 6. RELATÓRIOS GERENCIAIS E CURVA ABC
  // =========================================================================
  if (isAdminLoja || isDono || permissoesOperador?.ver_relatorios) {
    topicos.push({
      id: 'relatorios_gerenciais',
      icone: '📊',
      titulo: 'Relatórios Financeiros, Lucratividade & Curva ABC',
      categoria: 'Gestão & Relatórios',
      conteudo: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', color: '#0f172a' }}>Análise Completa de Vendas e Desempenho</h4>
          <ul style={{ paddingLeft: '20px', lineHeight: 1.6, margin: 0 }}>
            <li><strong>Filtros por Período:</strong> Consulte vendas de Hoje, 7 dias, Mês ou selecione um intervalo de datas personalizado.</li>
            <li><strong>Formas de Pagamento:</strong> Veja o total faturado separado por Dinheiro, PIX, Cartão de Crédito, Cartão de Débito e Fiado.</li>
            <li><strong>Curva ABC / Mais Vendidos:</strong> Descubra quais são os 20% dos produtos que geram 80% do faturamento da sua loja.</li>
            <li><strong>Lucro Bruto & Margem Real:</strong> Acompanhe a diferença entre o custo de aquisição e o preço de venda praticado.</li>
            <li><strong>Exportação:</strong> Exporte os relatórios em formato <strong>Excel (.CSV)</strong> ou imprima em <strong>PDF</strong> para sua contabilidade.</li>
            <li><strong>Estorno de Vendas:</strong> Administradores podem cancelar vendas incorretas. O cancelamento devolve os itens ao estoque e grava um log permanente de auditoria.</li>
          </ul>
        </div>
      ),
    });
  }

  // =========================================================================
  // 7. GESTÃO DE EQUIPE E PERMISSÕES (RBAC)
  // =========================================================================
  if (isAdminLoja || isDono || permissoesOperador?.gerenciar_equipe) {
    topicos.push({
      id: 'gestao_equipe_permissoes',
      icone: '👥',
      titulo: 'Cadastro de Operadores & Controle de Permissões Granulares',
      categoria: 'Equipe & Usuários',
      conteudo: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', color: '#0f172a' }}>Controle de Acessos dos Funcionários</h4>
          <p style={{ margin: 0, lineHeight: 1.6 }}>
            Defina exatamente o que cada funcionário do supermercado pode ver e executar:
          </p>
          <ul style={{ paddingLeft: '20px', lineHeight: 1.6, margin: 0 }}>
            <li><strong>Cadastro de Operador:</strong> Acesse "👥 Operadores / Equipe", informe Nome, CPF/Login e defina uma Senha/PIN de 4 dígitos.</li>
            <li><strong>Presets Rápidos:</strong> Aplique perfis prontos com 1 clique (<em>Operador de Caixa</em>, <em>Repositor</em>, <em>Supervisor</em> ou <em>Administrador</em>).</li>
            <li><strong>Permissões Individuais:</strong> Ative ou desative permissões pontuais, como aplicar descontos, abrir/fechar caixa, estornar vendas, dar baixa em perdas, gerenciar devedores ou ver relatórios.</li>
            <li><strong>Bloqueio Imediato:</strong> Ao desativar um operador, o acesso dele é revogado imediatamente em todos os terminais.</li>
          </ul>
        </div>
      ),
    });
  }

  // =========================================================================
  // 8. MODO OFFLINE & NUVEM FIREBASE
  // =========================================================================
  topicos.push({
    id: 'modo_offline_nuvem',
    icone: '📶',
    titulo: 'Funcionamento 100% Offline & Sincronização em Nuvem',
    categoria: 'Conexão & Nuvem',
    conteudo: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px 14px', color: '#166534', fontSize: '0.9rem' }}>
          ✅ <strong>O Supermercado Não Para:</strong> Mesmo se o cabo de rede for desconectado ou o Wi-Fi cair, você continua vendendo, bipando itens e recebendo pagamentos normalmente!
        </div>

        <h4 style={{ margin: '4px 0 0 0', fontSize: '1rem', color: '#0f172a' }}>Como Funciona a Fila Prioritária de Sincronização?</h4>
        <ol style={{ paddingLeft: '20px', lineHeight: 1.6, margin: 0 }}>
          <li><strong>Durante a Queda de Internet:</strong> As vendas e baixas de estoque são salvas no banco de dados local seguro do seu navegador.</li>
          <li><strong>Quando a Internet Retorna:</strong> O sistema detecta a conexão automaticamente e envia as vendas em primeiro lugar na fila de sincronização (Prioridade Crítica).</li>
          <li><strong>Backup Permanente:</strong> Todos os dados ficam gravados com segurança na nuvem Firebase Firestore.</li>
        </ol>
      </div>
    ),
  });

  // =========================================================================
  // 9. ATALHOS DE TECLADO
  // =========================================================================
  topicos.push({
    id: 'atalhos_teclado',
    icone: '⌨️',
    titulo: 'Guia Rápido de Teclas de Atalho no PDV',
    categoria: 'Agilidade & Atalhos',
    conteudo: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', color: '#0f172a' }}>Atalhos para Acelerar o Atendimento no Balcão</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.9rem' }}>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>Foco no Código de Barras</span>
            <kbd style={{ background: '#e2e8f0', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '0.85rem' }}>Enter / F2</kbd>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.9rem' }}>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>Finalizar Venda / Pagamento</span>
            <kbd style={{ background: '#e2e8f0', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '0.85rem' }}>F4 / Barra de Espaço</kbd>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.9rem' }}>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>Cancelar Venda Atual</span>
            <kbd style={{ background: '#e2e8f0', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '0.85rem' }}>Esc</kbd>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.9rem' }}>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>Buscar Produto por Nome</span>
            <kbd style={{ background: '#e2e8f0', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '0.85rem' }}>F3</kbd>
          </div>
        </div>
      </div>
    ),
  });

  // =========================================================================
  // 10. TÓPICOS MASTER (DONA DO APP)
  // =========================================================================
  if (isDono) {
    topicos.push({
      id: 'gestao_master_lojas',
      icone: '👑',
      titulo: 'Licenciamento Multi-Lojas, Bloqueio Remoto & Catálogo Global',
      categoria: 'Área Master (Proprietária)',
      conteudo: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', color: '#0f172a' }}>Painel Master do Dono do Aplicativo</h4>
          <ul style={{ paddingLeft: '20px', lineHeight: 1.6, margin: 0 }}>
            <li><strong>Cadastrar Supermercado Parceiro:</strong> Crie novas contas de lojas definindo Nome, CNPJ, limites de caixas contratados e senha inicial.</li>
            <li><strong>Bloqueio Remoto de Lojas:</strong> Suspenda o acesso de supermercados inadimplentes com apenas 1 clique. O bloqueio propaga em tempo real, impedindo login de toda a equipe da loja.</li>
            <li><strong>Catálogo Global Master:</strong> Cadastre produtos globais com fotos e códigos de barras pré-configurados que ficam automaticamente disponíveis para todos os supermercados.</li>
            <li><strong>Alteração de Credenciais Master:</strong> Altere seu usuário e senha master a qualquer momento no menu "🔑 Alterar Senha Master".</li>
          </ul>
        </div>
      ),
    });
  }

  // Filtragem por busca
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
        background: 'rgba(15, 23, 42, 0.88)',
        backdropFilter: 'blur(8px)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          width: '100%',
          maxWidth: '920px',
          height: '88vh',
          borderRadius: '18px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.35)',
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
            padding: '16px 20px',
            color: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.8rem' }}>📘</span>
            <div>
              <h2 style={{ fontSize: '1.18rem', fontWeight: 800, margin: 0, letterSpacing: '-0.01em', color: '#ffffff' }}>
                Manual do Usuário & Guia Operacional
              </h2>
              <p style={{ fontSize: '0.78rem', margin: '2px 0 0 0', opacity: 0.95 }}>
                Instruções completas para: <strong>{isDono ? '👑 Dono do App' : isAdminLoja ? '🏢 Administrador da Loja' : '🛒 Operador de Caixa'}</strong>
                {nomeLoja ? ` • ${nomeLoja}` : ''}
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
              flexShrink: 0,
            }}
            title="Fechar Manual"
          >
            ✕
          </button>
        </div>

        {/* CORPO DO MANUAL */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', flexDirection: 'row' }}>
          {/* BARRA LATERAL COM LISTA DE TÓPICOS */}
          <div
            style={{
              width: '300px',
              minWidth: '260px',
              borderRight: '1px solid #e2e8f0',
              background: '#f8fafc',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0' }}>
              <input
                type="text"
                placeholder="🔍 Pesquisar no manual..."
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.86rem',
                  boxSizing: 'border-box',
                  outline: 'none',
                  background: '#ffffff',
                }}
              />
            </div>

            <div style={{ overflowY: 'auto', flex: 1, padding: '8px' }}>
              {topicosFiltrados.map((topico) => {
                const ativo = topicoAtivo?.id === topico.id;
                return (
                  <button
                    key={topico.id}
                    onClick={() => setTopicoSelecionadoId(topico.id)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: 'none',
                      background: ativo ? '#0284c7' : 'transparent',
                      color: ativo ? '#ffffff' : '#334155',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      marginBottom: '4px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span style={{ fontSize: '1.2rem', marginTop: '1px' }}>{topico.icone}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.86rem', fontWeight: 700, lineHeight: 1.3 }}>
                        {topico.titulo}
                      </div>
                      <div style={{ fontSize: '0.72rem', opacity: ativo ? 0.9 : 0.65, marginTop: '2px' }}>
                        {topico.categoria}
                      </div>
                    </div>
                  </button>
                );
              })}

              {topicosFiltrados.length === 0 && (
                <div style={{ padding: '24px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.86rem' }}>
                  Nenhuma instrução encontrada para "{termoBusca}".
                </div>
              )}
            </div>
          </div>

          {/* ÁREA DE LEITURA */}
          <div
            style={{
              flex: 1,
              padding: '24px 28px',
              overflowY: 'auto',
              background: '#ffffff',
              fontSize: '0.92rem',
              color: '#334155',
              lineHeight: 1.65,
            }}
          >
            {topicoAtivo ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px', borderBottom: '2px solid #f1f5f9', paddingBottom: '14px' }}>
                  <span style={{ fontSize: '2.2rem' }}>{topicoAtivo.icone}</span>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: '#0284c7', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {topicoAtivo.categoria}
                    </span>
                    <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '2px 0 0 0' }}>
                      {topicoAtivo.titulo}
                    </h2>
                  </div>
                </div>

                <div>
                  {topicoAtivo.conteudo}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                Selecione um tópico na lista lateral para visualizar as orientações detalhadas.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

