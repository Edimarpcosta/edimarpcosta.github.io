# Baixar NFe Danfe PDF e XML via Chave

 PDF NFe e XML via Chave + download auto url/?chave=suachave&dowload=true url/?chave=sua_chave&download=pdf Se chave= pega dados nfe Se download=xml baixa xml Se download=pdf baixa pdf

Este é um projeto simples em HTML que permite baixar o PDF e XML de uma Nota Fiscal Eletrônica (NFe) usando a chave de acesso. Além disso, o projeto inclui a funcionalidade de preencher automaticamente o campo de chave através dos parâmetros da URL e baixar automaticamente o PDF ou XML, conforme a configuração dos parâmetros da URL.

## Funcionalidades

1. **Preenchimento automático do campo de chave**: Quando a página é carregada com o parâmetro `chave` na URL, a função `setChaveFromURLParam()` é acionada, preenchendo automaticamente o campo `chaveInput` com o valor do parâmetro da URL.

2. **Obtenção dos dados da NFe**: A função `getNFeData()` é responsável por buscar e exibir os dados JSON da NFe usando a chave de acesso informada no campo `chaveInput`.

3. **Download automático do PDF e XML**: Quando a página é carregada com o parâmetro `download` na URL, a função `checkDownloadParameter()` é acionada, verificando se o valor do parâmetro é `pdf` ou `xml`. Caso seja `pdf`, a função `postRequestPDF()` é chamada para baixar o PDF. Caso seja `xml`, a função `postRequestXML()` é chamada para baixar o XML.

## Como usar

1. Abra o link do projeto com a chave da NFe na URL, por exemplo: `https://edimarpcosta.github.io/nfe/?chave=suachave&download=true`. O parâmetro `chave` deve conter a chave de acesso da NFe que deseja consultar.

2. O campo `chaveInput` será preenchido automaticamente com a chave da NFe.

3. Caso o parâmetro `download` seja `true`, o PDF será baixado automaticamente. Caso o parâmetro `download` seja `pdf`, o PDF será baixado automaticamente. Caso o parâmetro `download` seja `xml`, o XML será baixado automaticamente.

4. Se desejar apenas visualizar os dados da NFe, clique no botão "Dados NFe". Os dados JSON da NFe serão exibidos na caixa de texto abaixo.

## Observações

- Certifique-se de que a chave de acesso informada é válida e corresponde a uma NFe existente.

- Caso ocorram erros durante o processo de download do PDF ou XML, verifique se a chave de acesso e os dados da API estão corretos.

- Este projeto utiliza a API `https://ws.meudanfe.com/api/v1` para buscar os dados da NFe e obter o PDF e XML. Certifique-se de que a API está funcionando corretamente para que o projeto funcione adequadamente.

- O projeto pode ser facilmente adaptado e integrado a outras aplicações web que necessitem baixar automaticamente o PDF e XML de NFes através da chave de acesso.

## Licença

Este projeto é de código aberto e está licenciado sob a licença MIT. Sinta-se à vontade para usar, modificar e distribuir o código conforme suas necessidades.
