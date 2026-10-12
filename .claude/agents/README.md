# Subagentes do projeto

Agentes usados na execução de planos com a skill `subagent-driven-development`.
O controlador (sessão principal) escolhe o agente pela **complexidade** da tarefa:
quanto mais complexa, maior o modelo.

## Regras gerais

- **Um subagente por vez.** O controlador só despacha o próximo depois que o anterior
  terminou e reportou. Nunca há dois subagentes rodando ao mesmo tempo (sempre em primeiro plano).
- **Subagente não cria subagente.** Nenhum agente daqui tem a ferramenta `Agent`.
- **Revisores são somente leitura.** Não têm `Write`/`Edit`; usam `Bash` só para ler (git log/diff, testes focados).
- Implementadores fazem commit no branch atual, **nunca** fazem push nem merge.
- Toda mensagem de commit termina com as linhas de atribuição indicadas pelo controlador.

## Classificação por complexidade

| Nível | Modelo | Quando usar |
|---|---|---|
| Baixa | `haiku` | O brief traz o código completo, até ~4 arquivos, sem decisão de integração (transcrever + testar). |
| Média | `sonnet` | SQL/segurança, primeira integração de várias peças (build, providers, rotas), lógica de formulário com muitos estados; toda revisão de tarefa e re-revisão. |
| Alta | `opus` | Julgamento de design, depuração aberta, revisão de UI com skills, verificação ponta a ponta; revisão final do branch. |

**Escalada:** na rodada 4–5 do ciclo de correção, a tarefa passa para o agente um nível acima.

## Agentes

| Agente | Modelo | Ferramentas | Skills |
|---|---|---|---|
| `implementador-baixa` | haiku | Read, Write, Edit, Bash, Glob, Grep | nenhuma — segue o brief à risca |
| `implementador-media` | sonnet | Read, Write, Edit, Bash, Glob, Grep, Skill | `supabase-postgres-best-practices` (SQL), `ui-ux-pro-max` (telas) |
| `implementador-alta` | opus | Read, Write, Edit, Bash, Glob, Grep, Skill, WebFetch | `ui-ux-pro-max`, `web-design-guidelines`, `supabase-postgres-best-practices`, `run` |
| `revisor-tarefa` | sonnet | Read, Grep, Glob, Bash, Skill | `supabase-postgres-best-practices` (SQL), `ui-ux-pro-max` (telas) |
| `revisor-final` | opus | Read, Grep, Glob, Bash, Skill, WebFetch | `requesting-code-review`, `supabase-postgres-best-practices`, `ui-ux-pro-max`, `web-design-guidelines` |
