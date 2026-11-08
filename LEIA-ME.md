# MinaLinks • Robô Shopee

Serviço de automação do painel MinaLinks. Ele consulta as ofertas, organiza a fila por nicho e envia para os grupos selecionados no WhatsApp.

## Servidor

O contêiner funciona continuamente e não depende do computador pessoal. A sessão do WhatsApp e a proteção contra mensagens repetidas ficam em `/data`, que deve ser um volume persistente.

Variáveis obrigatórias:

- `SITE_URL`: endereço publicado da MinaLinks.
- `OAI_SITES_TOKEN`: acesso privado do serviço ao painel.
- `BRIDGE_TOKEN`: segredo compartilhado entre painel e robô.
- `DATA_DIR=/data`: diretório persistente da sessão.

O serviço usa a porta fornecida em `PORT` e responde em `/` para a verificação de funcionamento.

## Railway

1. Publique esta pasta usando o `Dockerfile`.
2. Monte um volume persistente em `/data`.
3. Cadastre as três credenciais obrigatórias como variáveis secretas.
4. Abra Conexões na MinaLinks e escaneie o QR Code pelo menu **Aparelhos conectados** do WhatsApp.
5. Selecione os grupos e inicie os envios no painel.

Não compartilhe as variáveis secretas nem os arquivos de `/data`.

## Limites

O cliente do WhatsApp usado pelo robô não é oficial. Use somente grupos autorizados, respeite os limites de envio e mantenha intervalos adequados para reduzir risco de bloqueio.
