function adicionarProduto() {
  var codProduto = document.getElementById("codProduto").value;
  var qtdProduto = document.getElementById("qtdProduto").value;
  var valorProduto = document.getElementById("valorProduto").value;

  // Cria um elemento div para o produto
  var produtoDiv = document.createElement("div");
  produtoDiv.className = "produto";

  // Ajusta a string do produto com a formatação desejada
  produtoDiv.innerHTML = `
    <p>Cód produto: ${codProduto}</p>
    <p>Qtde: ${qtdProduto}</p>
    <p>Valor: ${valorProduto}</p>
  `;

  // Adiciona o produto à lista
  var lista = document.getElementById("listaProdutos");
  lista.appendChild(produtoDiv);

  // Limpa os campos após adicionar
  document.getElementById("codProduto").value = "";
  document.getElementById("qtdProduto").value = "";
  document.getElementById("valorProduto").value = "";
}

function enviarMensagem() {
  var vendedor = document.getElementById("vendedor").value;
  var pedido = document.getElementById("pedido").value;
  var cliente = document.getElementById("cliente").value;
  var indice = document.getElementById("indice").value;
  var valorTotal = document.getElementById("valorTotal").value;
  var motivo = document.getElementById("motivo").value;
  var supervisor = document.getElementById("listaSupervisores").value;

  // Coleta as informações dos produtos da lista
  var produtos = "";
  var listaProdutos = document.getElementById("listaProdutos");
  var produtosDiv = listaProdutos.querySelectorAll(".produto");
  produtosDiv.forEach(function(produtoDiv) {
    var paragrafos = produtoDiv.querySelectorAll("p");
    produtos += "-\n"; // Adiciona o hífen antes de cada produto
    paragrafos.forEach(function(paragrafo) {
      produtos += paragrafo.textContent.trim() + "\n"; // Adiciona o texto de cada <p> com uma quebra de linha
    });
  });

  // Monta a mensagem final
  var mensagem = "Vendedor: " + vendedor + "\n";
  mensagem += "Pedido: " + pedido + "\n";
  mensagem += "Cliente: " + cliente + "\n";
  mensagem += "Índice: " + indice + "\n";
  mensagem += "Valor da venda: " + valorTotal + "\n-\n"; // Mantém o hífen separador
  mensagem += produtos; // Adiciona os produtos à mensagem
  mensagem += "-\n"; // Adiciona um hífen final antes do motivo
  mensagem += "Motivo da negociação: " + motivo;

  // Abre o WhatsApp com a mensagem pré-definida
  var url = "https://wa.me/" + supervisor + "?text=" + encodeURIComponent(mensagem);
  window.open(url);
}
