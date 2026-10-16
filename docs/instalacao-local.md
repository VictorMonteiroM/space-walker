# Instalação no seu computador (REA + clone do Koltitrace)

Este guia leva o que foi montado na sessão em nuvem para a sua máquina. A sessão na
nuvem não alcança o seu computador, então os comandos abaixo são executados por você
no terminal local (PowerShell no Windows).

## 1. Pré-requisitos

| Item | Versão | Para quê |
|---|---|---|
| Node.js + npm | `^22.19`, `^24.11` ou `>=26` | REA e servidor estático do clone |
| Git | qualquer recente | clonar este repositório |
| Claude Code (CLI) | atual | registrar o MCP do REA |
| `ps` (procps) | só Linux | o REA usa para verificar processos que ele inicia |

Confira: `node -v` e `npm -v`. Se o Node for mais antigo que 22.19, atualize antes
(o REA recusa versões fora dessas faixas).

## 2. Baixar este repositório

```bash
git clone https://github.com/VictorMonteiroM/space-walker.git
cd space-walker
git checkout claude/repo-installation-dkzupb
```

## 3. Instalar o REA

```bash
npm install --global rea-agents
rea --version
```

Para análise de JavaScript/Electron e de páginas web (o caso do Koltitrace), **não
precisa** de Hopper, Ghidra nem IDA. Eles só são necessários para binários nativos.

## 4. Registrar o REA no Claude Code

Escolha **uma** das duas formas.

### Opção A — para todos os projetos (usuário)

```bash
rea setup --client claude_code --dry-run   # só mostra o que seria alterado
rea setup --client claude_code             # pede confirmação e aplica
```

O `setup` faz backup da configuração existente (`~/.claude.json.rea.backup`),
preserva o resto e instala a skill `reverse-engineer-anything`.

### Opção B — só para este projeto

Rode dentro da pasta `space-walker`, com `CLAUDE_CONFIG_DIR` **sem estar definida**.

macOS / Linux:

```bash
claude mcp add --scope local rea -- npx -y rea-agents@6.5.0 mcp
```

Windows (PowerShell):

```powershell
claude mcp add --scope local rea -- cmd.exe /d /c npx -y rea-agents@6.5.0 mcp
```

Evite `--scope project`: ele grava um `.mcp.json` dentro do repositório. A opção B
não instala a skill; para ter a skill, rode `rea setup --skill --yes`.

## 5. Verificar

```bash
rea doctor --client claude_code --skill
```

Esperado: `healthy: true`. Depois **reinicie o Claude Code** e confirme que as
ferramentas `rea` aparecem na sessão. Reiniciar é necessário: o registro só é lido na
inicialização.

No Windows, se o Claude Desktop estiver aberto, feche-o por completo antes de rodar o
`setup`, porque um app em execução pode sobrescrever o registro.

## 6. Rodar o clone do Koltitrace

```bash
npx serve koltitrace-clone
```

Abra o endereço que o comando mostrar (por exemplo `http://localhost:3000`):

- App: `/#/YXBwLTE5NjU0LWJhdGNoLWtvbHRpdHJhY2U`
- Console de teste manual: `/#/_console`

O clone usa só dados de exemplo em `koltitrace-clone/mock-data/` e não envia nada para
`qr.koltitrace.com`. Só carrega Vue e Leaflet por CDN e os tiles do OpenStreetMap, então
precisa de internet. Sem Node, `python3 -m http.server --directory koltitrace-clone 8080`
também serve.

## 7. Atualizar depois

```bash
rea update
```

Para a opção B, a versão fica fixa no comando (`rea-agents@6.5.0`): remova com
`claude mcp remove --scope local rea` e registre de novo com a versão nova.

## 8. Problemas comuns

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| `rea: command not found` | A pasta global do npm não está no PATH | `npm config get prefix` e adicione `<prefix>/bin` (Windows: o próprio `<prefix>`) ao PATH |
| `doctor` mostra `healthy: false` por Hopper/Ghidra | Engine nativa ausente | Ignore, a menos que vá analisar binários nativos |
| Ferramentas `rea` não aparecem no Claude Code | Sessão aberta antes do registro | Reinicie o Claude Code; confira com `claude mcp list` |
| Erro de versão do Node | Node abaixo de 22.19 | Atualize o Node (nvm, fnm ou instalador oficial) |
| Linux: falha ao iniciar análise de JavaScript | Falta um `ps` compatível com procps | Instale o pacote `procps` |

Fonte: documentação do REA, <https://github.com/morluto/rea/blob/main/docs/installation.md>.
