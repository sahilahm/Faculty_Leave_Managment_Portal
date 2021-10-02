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


$(".new-1").click(function(){
    $("#pub").append("<input type='text' class='form-control' name='publication' required>");
    $(".new-1").addClass("hidden");
    $(".send-1").removeClass("hidden");
});


$(".new-2").click(function(){
    $("#course").append("<input type='text' class='form-control' name='course' required>");
    $(".new-2").addClass("hidden");
    $(".send-2").removeClass("hidden");
});

$(".send-1").click(function(){
  $(".send-1").addClass("hidden");
  $(".new-1").removeClass("hidden");
});

$(".send-2").click(function(){
  $(".send-2").addClass("hidden");
  $(".new-2").removeClass("hidden");
});

$(".back").click(function() {
  post("/background/1"); // Outputs the answer
  $(this).closest("tr").remove();
});

$(".pub").click(function() {
  var item = $(this).closest("tr").find(".nr").text();

  post("/publication/" + item); // Outputs the answer
  $(this).closest("tr").remove();
});

$(".cour").click(function() {
  var item = $(this).closest("tr").find(".nr").text();

  post("/courses/" + item); // Outputs the answer
  $(this).closest("tr").remove();
});
