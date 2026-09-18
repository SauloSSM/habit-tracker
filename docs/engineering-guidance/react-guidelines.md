# Habit Tracker — React Engineering Guidelines

Este documento define princípios e convenções de engenharia para o Habit Tracker.

O objetivo é manter o código:
- simples;
- previsível;
- testável;
- fácil de evoluir;
- coerente com as decisões de produto.

Estas regras existem para ajudar o projeto, não para gerar abstração ou refatoração sem necessidade.

---

## 0. Ordem de prioridade

Quando houver conflito, seguir esta ordem:

1. Especificação da Phase atual.
2. Regras e invariantes do domínio.
3. Arquitetura já existente no projeto.
4. Este guia.
5. Convenções genéricas de React.

Não alterar arquitetura, adicionar dependências ou reorganizar pastas apenas para cumprir este documento.

Mudanças estruturais relevantes devem ser decisões explícitas.

---

## 1. Stack atual

Stack oficial atual:

- React 19
- TypeScript strict
- Vite
- localStorage
- Vitest

Não assumir automaticamente:

- backend;
- TanStack Query;
- React Hook Form;
- Zod;
- Zustand;
- Redux;
- MSW.

Essas ferramentas podem ser adicionadas quando uma necessidade real justificar.

Não introduzir dependência apenas porque ela representa uma prática comum em projetos maiores.

---

## 2. Filosofia de estado

Antes de criar estado React, perguntar nesta ordem:

1. O valor pode ser derivado de dados existentes?
   → derivar.

2. O valor pertence a um sistema externo?
   → sincronizar com a ferramenta apropriada.

3. O valor pertence à URL?
   → usar URL/search params quando aplicável.

4. O valor pertence ao DOM?
   → DOM ou ref.

5. É estado local simples?
   → useState.

6. Existem várias transições relacionadas com regras?
   → considerar useReducer.

7. É compartilhado por uma árvore relevante?
   → considerar Context.

8. É verdadeiramente global e de alta frequência?
   → considerar store externa apenas se houver necessidade comprovada.

Estado derivado não deve ser duplicado.

---

## 3. useState

Use useState para estado local e independente.

Atualizações dependentes do valor anterior devem usar forma funcional.

Inicializações caras devem usar lazy initializer.

Evitar conjuntos de booleanos capazes de representar estados impossíveis.

Prefira uniões discriminadas quando o domínio possuir estados mutuamente exclusivos.

Não existe limite numérico rígido de useState.

Muitos estados relacionados são um sinal para revisar a responsabilidade do componente ou considerar reducer.

---

## 4. useReducer

Use reducer quando:

- várias propriedades mudam juntas;
- existem transições de domínio;
- ações possuem regras;
- uma máquina de estados começa a surgir.

Reducers devem:

- ser funções puras;
- ficar fora do componente;
- possuir actions tipadas;
- evitar efeitos colaterais;
- evitar Date.now(), fetch ou acesso ao localStorage;
- ser testáveis diretamente.

Não usar reducer para estado trivial.

---

## 5. useEffect

useEffect existe principalmente para sincronização entre React e sistemas externos.

Exemplos legítimos:

- localStorage;
- timers;
- listeners;
- observers;
- APIs imperativas;
- bibliotecas externas;
- sincronização com browser APIs.

Evitar useEffect para:

- calcular estado derivado;
- reagir a um clique que poderia ser tratado no próprio handler;
- sincronizar dois estados React;
- transformar dados;
- resetar estado derivável de props.

Todo efeito com subscription, timer ou listener deve possuir cleanup apropriado.

Efeitos devem ser seguros sob React StrictMode.

Não suprimir dependências apenas para silenciar lint.

---

## 6. Lógica de domínio

Regras de negócio não pertencem ao JSX.

Sempre que possível:

React component
→ orquestra interação e renderização

Hook
→ coordena estado e efeitos

Domain function
→ contém regra pura

Storage/API boundary
→ valida dados externos

Funções de domínio devem ser pequenas, explícitas e testáveis sem React.

Exemplos atuais:

- consistency.ts
- focus.ts
- statistics.ts
- dayQuality.ts

Uma única fonte da verdade deve existir para cada informação.

Nunca persistir estado que possa ser derivado com segurança de outra fonte autoritativa.

Exemplo importante do produto:

Para hábitos FOCUS, FocusSession é a fonte da verdade.

DONE deve ser derivado das sessões, não duplicado como check-in persistido.

---

## 7. Tipos

TypeScript strict é obrigatório.

Evitar:

- any;
- @ts-ignore;
- casts usados apenas para silenciar o compilador;
- tipos genéricos como object ou Function.

Dados que possuem estados distintos devem preferir uniões discriminadas.

Estados impossíveis devem, sempre que razoável, ser impossíveis de representar.

Dados externos precisam de validação em runtime.

Isso inclui:

- localStorage;
- APIs futuras;
- query params;
- arquivos importados.

A validação pode usar:

- parser manual explícito;
- schema library como Zod quando a complexidade justificar.

Não adicionar Zod somente por convenção.

---

## 8. Componentes

Componentes devem possuir responsabilidade clara.

Preferir componentes pequenos e coesos, mas não dividir código apenas para atingir métricas artificiais.

Número de linhas e quantidade de props são sinais de complexidade, não regras absolutas.

Evitar:

- lógica de negócio dentro do componente;
- componentes definidos dentro de componentes;
- ternários profundamente aninhados;
- prop configurations gigantes;
- componentes que fazem fetch, transformação, validação e renderização ao mesmo tempo.

Preferir composição quando ela realmente simplificar a API.

---

## 9. JSX

Priorizar leitura simples.

Casos de borda podem usar early return.

Evitar ternários aninhados.

Condições complexas devem possuir nomes que expressem intenção.

Keys de listas devem ser estáveis e derivadas da entidade.

Não usar índice como key quando a lista puder reordenar, remover ou inserir itens.

---

## 10. Custom hooks

Hooks devem representar casos de uso ou responsabilidades claras.

Lógica puramente determinística deve permanecer fora dos hooks.

Hooks não devem conhecer JSX.

Quando um hook começar a expor estado e ações demais, revisar se ele está assumindo responsabilidades diferentes.

Não dividir hooks apenas por estética.

---

## 11. Persistência

localStorage é atualmente um sistema externo e uma fronteira não confiável.

Todo conteúdo carregado deve ser validado ou normalizado.

Migrações devem:

- preservar dados existentes;
- ser determinísticas;
- possuir testes;
- possuir versionamento explícito;
- falhar de forma segura.

O código nunca deve assumir que dados armazenados anteriormente possuem o shape atual.

Alterações de schema devem avançar a versão quando necessário.

Dados inválidos devem ser descartados ou normalizados conscientemente, nunca causar crash silencioso.

---

## 12. Formulários

Para formulários simples, estado React local é aceitável.

React Hook Form ou bibliotecas de schema devem ser introduzidos quando a complexidade justificar.

Não adicionar uma biblioteca de formulário apenas porque existe um formulário.

Validação de domínio deve, sempre que possível, existir em funções reutilizáveis fora do componente.

---

## 13. Dados de servidor

Atualmente o projeto não possui servidor.

Se uma API/backend for adicionada futuramente:

- separar server state de client state;
- evitar useEffect + fetch + useState como arquitetura principal;
- considerar TanStack Query ou ferramenta equivalente;
- manter camada de API fora dos componentes.

TanStack Query não deve ser adicionada antes de existir server state real.

---

## 14. Performance

Não otimizar por reflexo.

Não usar memo, useMemo ou useCallback apenas por hábito.

Primeiro identificar problema real.

Priorizar:

- estado próximo de onde é usado;
- estrutura simples;
- componentes coesos;
- evitar renders causados por estado global desnecessário.

Otimizações devem possuir motivo observável.

---

## 15. Acessibilidade

Usar HTML semântico sempre que possível.

Preferir:

- button;
- input;
- label;
- nav;
- main;
- section.

Evitar div clicável quando existe elemento semântico adequado.

Inputs devem possuir labels.

Controles apenas com ícones precisam de nome acessível.

Foco de teclado deve permanecer visível.

Modais futuros devem tratar:

- focus trap;
- Escape;
- retorno de foco ao elemento original.

---

## 16. Testes

Vitest é a ferramenta base.

Testar a camada adequada.

### Funções de domínio

Teste unitário direto.

Exemplos:

- focus.ts;
- consistency.ts;
- migrations;
- statistics.ts.

### Componentes e fluxos

Quando houver comportamento de UI relevante:

- Testing Library;
- user-event;
- queries por acessibilidade.

### Integração HTTP futura

Quando existir backend:

- considerar MSW.

Não adicionar Testing Library ou MSW enquanto não houver necessidade real.

Testes devem verificar comportamento e regras, não detalhes internos de implementação.

Todo bug corrigido deve, quando possível, começar por um teste que reproduza o problema.

---

## 17. Organização do projeto

A estrutura atual é válida:

src/
  components/
  hooks/
  services/
  types/
  utils/

Não reorganizar o projeto apenas para seguir uma convenção.

Quando o número de features crescer significativamente, organização por feature poderá ser considerada:

src/
  features/
    habits/
    focus/
    insights/

Essa migração deve acontecer somente quando reduzir complexidade real.

Não realizar reorganização estrutural como efeito colateral de uma feature.

---

## 18. Regras específicas do Habit Tracker

### CHECK_IN

Check-ins persistidos representam explicitamente a ação do usuário.

### FOCUS

FocusSession é a fonte da verdade do progresso diário.

Sessões do mesmo hábito e dia são acumuladas.

minimumMinutes define cumprimento.

targetMinutes e stretchMinutes representam intensidade.

Target e Stretch não aumentam Daily Consistency além do cumprimento normal.

### Weekly targets

WEEKLY_TARGET possui progresso semanal próprio.

Metas semanais não participam de:

- Daily Consistency;
- streak diário;
- heatmap diário;
- estatísticas diárias.

### Datas

Datas de domínio usam chave local:

YYYY-MM-DD

FocusSession.date é autoritativa para atribuição histórica.

Timestamps representam instantes, não devem reinterpretar retroativamente a data da sessão.

### Histórico

Arquivar preserva histórico.

Excluir pode remover dados relacionados quando essa for a regra explícita do domínio.

---

## 19. Escopo das Phases

Cada Phase deve implementar somente o escopo definido.

Não antecipar fases futuras.

Se a Phase é de domínio:

não implementar UI.

Se a Phase é de persistência:

não implementar regra de apresentação.

Se a Phase é de timer:

não aproveitar para redesenhar o app.

Refatorações adjacentes só devem acontecer quando necessárias para cumprir a tarefa atual.

---

## 20. Fluxo de entrega

Antes de editar:

1. inspecionar o código relevante;
2. identificar invariantes;
3. apresentar plano curto.

Durante:

- mudanças pequenas;
- preservar comportamento existente;
- testes junto da implementação.

Depois:

npm test
npm run lint
npm run build
git diff --check

Ao finalizar, reportar:

- arquivos alterados;
- comportamento implementado;
- testes adicionados;
- decisões tomadas;
- riscos ou dívida para a próxima Phase.

---

## 21. Git

Uma feature ou Phase relevante deve utilizar branch própria.

Fluxo:

main
→ branch da Phase
→ implementação
→ testes
→ commit
→ push
→ Pull Request
→ CI
→ review
→ merge

Commits devem representar mudanças coerentes.

Não misturar refatorações não relacionadas.

---

## 22. Princípio final

Escolher a solução mais simples que preserve corretamente o domínio.

Complexidade deve ser conquistada por necessidade.

Não construir hoje a arquitetura que talvez seja necessária daqui a um ano.