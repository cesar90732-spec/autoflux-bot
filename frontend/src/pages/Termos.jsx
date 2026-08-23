// src/pages/Termos.jsx
// Termos de Uso e Política de Privacidade — página pública (sem login).
// AVISO: isto é um ponto de partida, não é assessoria jurídica. Antes de
// usar com clientes pagantes de verdade, vale revisar com um advogado
// (principalmente as cláusulas de LGPD, cobrança e responsabilidade).
import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';

export default function Termos() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 dark:bg-slate-950">
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <Link to="/" className="mb-6 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
            <MessageCircle size={20} />
          </div>
          <span className="text-lg font-semibold text-slate-900 dark:text-white">AutoFlux</span>
        </Link>

        <h1 className="mb-1 text-xl font-semibold text-slate-900 dark:text-white">
          Termos de Uso e Política de Privacidade
        </h1>
        <p className="mb-6 text-xs text-slate-400 dark:text-slate-500">
          Última atualização: agosto de 2026
        </p>

        <div className="space-y-5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          <section>
            <h2 className="mb-1 font-semibold text-slate-800 dark:text-slate-200">1. O que é o AutoFlux</h2>
            <p>
              O AutoFlux é uma ferramenta de atendimento automatizado via WhatsApp. Ao criar uma conta,
              você conecta o WhatsApp da sua empresa à plataforma para automatizar respostas, organizar
              conversas e (opcionalmente) usar inteligência artificial no atendimento.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-slate-800 dark:text-slate-200">2. Quais dados coletamos</h2>
            <p>
              Coletamos os dados que você informa no cadastro (nome, e-mail, telefone, nome da empresa) e
              os dados gerados pelo uso da plataforma: mensagens trocadas com seus contatos, número de
              telefone e nome dos contatos, catálogo de produtos e histórico de conversas.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-slate-800 dark:text-slate-200">
              3. Uso de inteligência artificial
            </h2>
            <p>
              Se você ativar o atendimento por IA, o conteúdo das conversas é enviado para o provedor de
              IA configurado (ex: OpenAI, Google, Anthropic ou Groq) para gerar respostas, resumos ou
              sugestões. Esses provedores processam os dados conforme suas próprias políticas de
              privacidade. Você é responsável por avisar seus próprios clientes sobre esse uso, se
              exigido pela legislação aplicável.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-slate-800 dark:text-slate-200">4. Como usamos os dados</h2>
            <p>
              Usamos os dados exclusivamente para operar a plataforma: entregar mensagens, gerar
              relatórios, gerenciar sua conta e cobrança. Não vendemos dados de contatos ou conversas a
              terceiros.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-slate-800 dark:text-slate-200">
              5. Seus direitos (LGPD)
            </h2>
            <p>
              Você pode solicitar a qualquer momento a exportação ou exclusão dos dados da sua empresa,
              entrando em contato pelo suporte. A exclusão da conta remove permanentemente conversas,
              contatos e configurações associadas.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-slate-800 dark:text-slate-200">6. Cobrança</h2>
            <p>
              O plano é cobrado mensalmente via Pix após o período de teste gratuito. O acesso pode ser
              suspenso em caso de atraso no pagamento, mediante aviso prévio.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-slate-800 dark:text-slate-200">7. Contato</h2>
            <p>
              Dúvidas sobre estes termos ou sobre seus dados podem ser enviadas para o suporte informado
              no painel.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
