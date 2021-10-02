function post(path, params, method = 'post') {

  // The rest of this code assumes you are not using a library.
  // It can be made less verbose if you use one.
  const form = document.createElement('form');
  form.method = method;
  form.action = path;

  for (const key in params) {
    if (params.hasOwnProperty(key)) {
      const hiddenField = document.createElement('input');
      hiddenField.type = 'hidden';
      hiddenField.name = key;
      hiddenField.value = params[key];

      form.appendChild(hiddenField);
    }
  }

  document.body.appendChild(form);
  form.submit();
}

$(".use-address").click(function() {
  var item = $(this).closest("tr").find(".nr").text();

  post("/comments/" + item, {
    AppID: item
  }); // Outputs the answer
});

$(".use-1").click(function() {
  var item = $(this).closest("tr").find(".nr").text();

  post("/approve/" + item, {
    AppID: item
  }); // Outputs the answer
  $(this).closest("tr").remove();
});

$(".use-2").click(function() {
  var item = $(this).closest("tr").find(".nr").text();

  post("/reject/" + item, {
    AppID: item
  }); // Outputs the answer
  $(this).closest("tr").remove();
});

$(".use-3").click(function() {
  var item = $(this).closest("tr").find(".nr").text();

  post("/approved/" + item, {
    AppID: item
  }); // Outputs the answer
  $(this).closest("tr").remove();
});

$(".use-4").click(function() {
  var item = $(this).closest("tr").find(".nr").text();

  post("/rejected/" + item, {
    AppID: item
  }); // Outputs the answer
  $(this).closest("tr").remove();
});