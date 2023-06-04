var serviceURL = document.URL;

function enviar() {
    var val1 = document.getElementById("temp").value;
    var val2 = document.getElementById("ilum").value;
    
    var url = serviceURL+"/"+oper+"/"+val1+"/"+val2;
    
    var httpRequest = new XMLHttpRequest();

    httpRequest.onreadystatechange = function() {
        if (httpRequest.readyState === 4){
            var resultado = document.getElementById("resul");
            resultado.innerHTML = httpRequest.responseText;
        }
    };
    httpRequest.open("GET", url, true);
    httpRequest.send(null);
}