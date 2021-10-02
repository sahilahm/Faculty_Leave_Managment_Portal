const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const pool= require("./db");
const mongoose = require('mongoose');
const bcrypt = require("bcrypt");                   // for using next level hashing and salting
const saltRounds = 6;

const app = express();

mongoose.connect("mongodb://localhost:27017/facultyDB", {useNewUrlParser: true , useUnifiedTopology: true});

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));

// ---------------------------------------------- MongoDB schemas --------------------------------------------------

const facultySchema = new mongoose.Schema({
  facid: Number,
  name: String,
  background: String,
  Publication: [String],
  courses: [String]
});

const Faculty = mongoose.model("Faculty",facultySchema);

// ---------------------------------------------- Global variables --------------------------------------------------
const TNOL= 10;  // Total number of Leaves
var FacID,AppID,Des,HireID;
var temp,i;


// ----------------------------------------------Main backend code ---------------------------------------------------

app.get("/", function(req, res) {
  res.render("home");
});

app.get("/myProf",function(req,res){
  var pub=[],bg='',courses=[];

  Faculty.findOne({facid: FacID},function(err,doc){
    bg = doc.background;
    pub = doc.Publication;
    courses = doc.courses;

    res.render("updateProfile",{
      back:bg,
      pub:pub,
      courses:courses
    });

  });

});

app.get("/login",function(req,res){
  res.render("signinFaculty");                         // accesses "login.ejs" in "views" folder
});

app.get("/signUp",function(req,res){
  res.render("signupFaculty");
});

app.get("/faculty_dashboard",async(req,res)=>{

  try{

    var fac_data = await pool.query(
      "SELECT * FROM Faculty WHERE FacID=$1",
      [FacID]
    );
    
    var status;
    if(fac_data.rows[0].ws==1)
    { status= "Active"; }
    else if(fac_data.rows[0].ws==0)
    { status= "Inactive"; }

    res.render("facultyDashboard",
    {
      name: fac_data.rows[0].facname,
      department: fac_data.rows[0].dept,
      designation: fac_data.rows[0].desig,
      facultyid: fac_data.rows[0].facid,
      email: fac_data.rows[0].email,
      status: status,
      tnol: fac_data.rows[0].tnol,
      type: fac_data.rows[0].role      
    });

  }
  catch(err){
    console.error(err.message);
  }
});

app.get("/specialFacultyDashboard",async(req,res)=>{
  try{
    var fac_data = await pool.query(
      "SELECT * FROM Faculty WHERE FacID=$1",
      [FacID]
    );

    var status;
    if(fac_data.rows[0].ws==1)
    { status= "Active"; }
    else if(fac_data.rows[0].ws==0)
    { status= "Inactive"; }

    res.render("specialFacultyDashboard",
    {
      name: fac_data.rows[0].facname,
      department: fac_data.rows[0].dept,
      designation: fac_data.rows[0].desig,
      facultyid: fac_data.rows[0].facid,
      email: fac_data.rows[0].email,
      status: status,
      tnol: fac_data.rows[0].tnol,
      type: fac_data.rows[0].role
    });

  }
  catch(err){
    console.error(err.message);
  }
});


app.get("/dashboard",async(req,res)=>{
  try{
    temp = await pool.query(
      "SELECT desig FROM faculty WHERE facid=$1",[FacID]
    );

    if(temp.rows[0].desig=='Faculty')
    { res.redirect("/faculty_dashboard"); }
    else{
      res.redirect("/specialFacultyDashboard");
    }
  }
  catch(err){
    console.error(err.message);
  }
});

app.get("/leaveApplication",async(req,res)=>{
  try{

    var tol = await pool.query(
      "SELECT tnol FROM Faculty WHERE facid=$1",[FacID]
    );

    if(tol.rows[0].tnol<=0)
    { res.send("<h1>No more leaves are available for you.</h1>"); }
    else
    {

      var leaveData= await pool.query(
        "SELECT max(AppID) FROM LeaveApp WHERE FacID=$1",
        [FacID]
      );

      AppID = leaveData.rows[0].max;

      var leaveData = await pool.query(
        "SELECT retro,appstatus FROM leaveapp WHERE appid=$1",[AppID]
      );

      if(leaveData.rows.length==0)
      { res.render("leaveApplication"); }
      else if(leaveData.rows[0].appstatus==-1 || leaveData.rows[0].appstatus==3)
      { res.render("leaveApplication"); }
      else if(leaveData.rows[0].appstatus==2)
      {     

        if(leaveData.rows[0].retro==0)
        {res.render("leaveApplication");}
        else
        { res.send("<H1>Your past application is under process.</H1>"); }
      }
      else
      { res.send("<H1>Your past application is under process.</H1>"); }
    }


  }
  catch(err){
    console.error(err.message);
  }
});

app.get("/leaveStatus",async(req,res)=>{

  try{
    const leaveData= await pool.query(
      "SELECT l1.AppID,l1.Title,l1.nod,l1.startDate,l1.AppStatus,l1.retro,f1.desig FROM LeaveApp l1,Faculty f1 WHERE l1.FacID=$1 AND l1.facid=f1.facid",
      [FacID]
    );

    // console.log(leaveData.rows);
    res.render("applicationStatus",{
      App: leaveData.rows
    });
  }
  catch(err){
    console.error(err.message);
  }

});


app.get("/faculty_applications",async(req,res)=>{
  try{
      var arr=[];

      var design = await pool.query(
        "SELECT Desig,Dept FROM Faculty WHERE facid=$1",
        [FacID]
      );
      
      if(design.rows[0].desig=='HOD')
      {

        if(design.rows[0].dept=="Computer Science")
        {
          var pending_data = await pool.query(
            "SELECT pendingapp,appstatus FROM HOD_CS"
          );
          
          var len = pending_data.rows.length;

          for(i=0;i<len;i++)
          {
            var app_data = await pool.query(
              "SELECT f1.facid,f1.facname,l1.appid,l1.title,h1.appstatus FROM faculty f1,leaveapp l1,HOD_CS h1 WHERE l1.appid=$1 AND l1.facid=f1.facid AND h1.pendingapp=$1",
              [pending_data.rows[i].pendingapp]
            );
            
            arr.push(app_data.rows);
          }
        }
        else if(design.rows[0].dept=="Electrical")
        {
          var pending_data = await pool.query(
            "SELECT pendingapp,appstatus FROM HOD_EE"
          );
          
          var len = pending_data.rows.length;

          for(i=0;i<len;i++)
          {
            var app_data = await pool.query(
              "SELECT f1.facid,f1.facname,l1.appid,l1.title,h1.appstatus FROM faculty f1,leaveapp l1,HOD_EE h1 WHERE l1.appid=$1 AND l1.facid=f1.facid AND h1.pendingapp=$1",
              [pending_data.rows[i].pendingapp]
            );
            
            arr.push(app_data.rows);
          }
        }
        else if(design.rows[0].dept=="Mechanical")
        {
          var pending_data = await pool.query(
            "SELECT pendingapp,appstatus FROM HOD_ME"
          );
          
          var len = pending_data.rows.length;

          for(i=0;i<len;i++)
          {
            var app_data = await pool.query(
              "SELECT f1.facid,f1.facname,l1.appid,l1.title,h1.appstatus FROM faculty f1,leaveapp l1,HOD_ME h1 WHERE l1.appid=$1 AND l1.facid=f1.facid AND h1.pendingapp=$1",
              [pending_data.rows[i].pendingapp]
            );
            
            arr.push(app_data.rows);
          }
        }
        else if(design.rows[0].dept=="Civil")
        {
          var pending_data = await pool.query(
            "SELECT pendingapp,appstatus FROM HOD_CE"
          );
          
          var len = pending_data.rows.length;

          for(i=0;i<len;i++)
          {
            var app_data = await pool.query(
              "SELECT f1.facid,f1.facname,l1.appid,l1.title,h1.appstatus FROM faculty f1,leaveapp l1,HOD_CE h1 WHERE l1.appid=$1 AND l1.facid=f1.facid AND h1.pendingapp=$1",
              [pending_data.rows[i].pendingapp]
            );
            
            arr.push(app_data.rows);
          }
        }

      }
      else if(design.rows[0].desig=='DFA')
      {
        var pending_data = await pool.query(
          "SELECT pendingapp,appstatus FROM DFA"
        );
        
        var len = pending_data.rows.length;

        for(i=0;i<len;i++)
        {
          var app_data = await pool.query(
            "SELECT f1.facid,f1.facname,l1.appid,l1.title,h1.appstatus FROM faculty f1,leaveapp l1,DFA h1 WHERE l1.appid=$1 AND l1.facid=f1.facid AND h1.pendingapp=$1",
            [pending_data.rows[i].pendingapp]
          );
          
          arr.push(app_data.rows);
        }
      }
      else
      {
        var pending_data = await pool.query(
          "SELECT pendingapp,appstatus FROM Director"
        );

        var len = pending_data.rows.length;

        for(i=0;i<len;i++)
        {
          var app_data = await pool.query(
            "SELECT f1.facid,f1.facname,l1.appid,l1.title,h1.appstatus FROM faculty f1,leaveapp l1,Director h1 WHERE l1.appid=$1 AND l1.facid=f1.facid AND h1.pendingapp=$1",
            [pending_data.rows[i].pendingapp]
          );
          
          arr.push(app_data.rows);
        }
      }

      res.render("statusApplication",{
        App: arr
      });
  
  }
  catch(err){
    console.error(err.message);
  }
  
});


app.get("/appoint",function(req,res){
  res.render("appointmentForm");
});


app.get("/comments/:appid",async(req,res)=>{
  try{
    AppID= req.params.appid;
    var leave_data = await pool.query(
      "SELECT title,content FROM leaveApp WHERE AppID=$1",
      [AppID]
    );

    var comment_data = await pool.query(
      "SELECT f2.facname,f1.facname,c1.content,c1.commentid FROM Comments c1,leaveapp l1,faculty f1,faculty f2 WHERE c1.appid=$1 AND c1.appid=l1.appid AND c1.sendbyid=f1.facid AND c1.sendtoid=f2.facid ORDER BY c1.commentid",
      [AppID]
    );

    // console.log(comment_data.rows);

    res.render("comments.ejs",{
      appid: AppID,
      title: leave_data.rows[0].title,
      content: leave_data.rows[0].content,
      App: comment_data.rows
    });
  }
  catch(err){
    console.error(err.message);
  }
  
});


app.get("/projectDetail",async(req,res)=>{

  try{
    const leaveData= await pool.query(
      "SELECT h1.HireID,h1.Title,h1.type,h1.duration,h1.status,f1.role FROM HireApp h1,faculty f1 WHERE H1.pid=f1.pid AND f1.facid=$1",
      [FacID]
    );

    res.render("projectDetail",{
      App: leaveData.rows
    });
    console.log(leaveData.rows);
  }
  catch(err){
    console.error(err.message);
  }

});

app.get("/hiringApplications",async(req,res)=>{
  try{
      var arr=[];

      var design = await pool.query(
        "SELECT role,desig FROM Faculty WHERE facid=$1",
        [FacID]
      );
      // console.log(design.rows[0].role);
      if(design.rows[0].role=='Project Instructor' && design.rows[0].desig!='DSA')
      {

          var pending_data = await pool.query(
            "SELECT pendingapp,appstatus FROM Instruc WHERE PI=$1",[FacID]
          );
          
          var len = pending_data.rows.length;

          

          for(i=0;i<len;i++)
          {
            var app_data = await pool.query(
              "SELECT h1.HireID,h1.title,h1.type,h1.duration,i1.appstatus FROM hireapp h1,faculty f1, instruc i1 WHERE f1.pid=h1.pid AND f1.facid=i1.pi AND i1.pendingapp=$1",
              [pending_data.rows[i].pendingapp]
            );
            
            arr.push(app_data.rows);
          }
      }
      else if(design.rows[0].desig=='DSA')
      {
        var pending_data = await pool.query(
          "SELECT pendingapp,appstatus FROM DSA"
        );
        
        var len = pending_data.rows.length;

        // console.log(pending_data.rows);

        for(i=0;i<len;i++)
        {
          var app_data = await pool.query(
            "SELECT l1.hireid,l1.title,l1.type,l1.duration,h1.appstatus FROM hireapp l1,DSA h1 WHERE l1.hireid=h1.pendingapp AND h1.pendingapp=$1",
            [pending_data.rows[i].pendingapp]
          );
          
          arr.push(app_data.rows);
        }
      }

      // console.log(arr);
      
      res.render("hiringApplication",{
        App: arr
      });
  
  }
  catch(err){
    console.error(err.message);
  }
  
});


// ------------------------------------------------------- POST ----------------------------------------------------

// Data from SignUp page is processed here
app.post("/signUp", async(req,res)=>{
  try{
      const username = req.body.name;
      var password = req.body.pswd;
      const retypedPassword = req.body.repswd;

      var Dept= req.body.dept;
      if(Dept=="cs")
      { Dept= "Computer Science"; }
      else if(Dept=="ee")
      { Dept= "Electrical"; }
      else if(Dept=="me")
      { Dept= "Mechanical"; }
      else if(Dept=="ce")
      { Dept= "Civil"; }

      var role=req.body.role;
      if(role=="pi")
      { role="Project Instructor";}
      else if(role=="copi")
      { role="CO Project Instructor";}

      var Pid=req.body.Pid;

      const email= req.body.email;

      if(retypedPassword==password)
      {
          bcrypt.hash(password, saltRounds , async(err,hash)=>{

            var Fac_id= await pool.query(
              "SELECT FacID FROM Track_of_ID"
            );

            FacID= Fac_id.rows[0].facid;
            temp=1;
            
            const newtodo = await pool.query(
              "INSERT INTO faculty (FacID,FacName,Dept,Desig,Role,Pid,Email,ws,Pswd,TNOL) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *", 
              [FacID,username,Dept,"Faculty",role,Pid,email,temp,hash,TNOL]
            );
            FacID++;
            const updateTrack = await pool.query(
              "UPDATE Track_of_ID SET FacID=$1",
              [FacID]
            );
            
            FacID--;
            
            temp = new Faculty({
              facid: FacID,
              name: username,
              background: "",
              Publication: [],
              courses: []
            });

            temp.save();
            res.redirect("/faculty_dashboard");
        });
          

      }
      else{ 
          res.redirect("/signUp");
      } 
      
      
  }
  catch(err){
      console.error(err.message);
  }
});

// Data from Login page is processed here
app.post("/login", async(req,res)=>{
  try{
      FacID = req.body.facID;
      const password = req.body.pswd;

      var newtodo = await pool.query(
        "SELECT EXISTS(SELECT FacID FROM Faculty WHERE FacID=$1)",
        [FacID]
      );

      if(newtodo==0)
      { res.send("<H1>Faculty ID does not exist</H1>"); }
      else
      {

        var pswd = await pool.query(
          "SELECT Pswd FROM Faculty WHERE FacID=$1",
          [FacID]
        );

        var desig = await pool.query(
          "SELECT desig FROM Faculty WHERE FacID=$1",
          [FacID]
        );
        Des= desig.rows[0].desig;
        if(Des=="Faculty")
        { 
          temp=0; 
          var todo = await pool.query(
            "SELECT nod,retro,appstatus FROM leaveapp WHERE facid=$1",[FacID]
          );

          var len = todo.rows.length, sum=0;

          for(i=0;i<len;i++)
          {
            if(todo.rows[i].retro==0)
            {
              if(todo.rows[i].appstatus==2)
              { sum= sum+todo.rows[i].nod; }
            }
            else
            {
              if(todo.rows[i].appstatus==3)
              { sum= sum+todo.rows[i].nod; }
            }
          }

          var updateTNOL = await pool.query(
            "UPDATE faculty SET TNOL=$1 WHERE facid=$2",[10-sum,FacID]
          );
        }
        else
        { 
          temp=1; 
          var todo = await pool.query(
            "SELECT nod,retro,appstatus FROM leaveapp WHERE facid=$1",[FacID]
          );

          var len = todo.rows.length, sum=0;

          for(i=0;i<len;i++)
          {
            if(todo.rows[i].appstatus==3 || todo.rows[i].appstatus==2)
            { sum= sum+todo.rows[i].nod; }
          
          }

          var updateTNOL = await pool.query(
            "UPDATE faculty SET TNOL=$1 WHERE facid=$2",[10-sum,FacID]
          );
        }

        bcrypt.compare(password, pswd.rows[0].pswd, function(err,result){      // comparison for "bcrypt"
          if(result==true)
          { 
            if(temp==0)
            { res.redirect("/faculty_dashboard"); }
            else
            { res.redirect("/specialFacultyDashboard"); }
          }
          else
          { res.send("<h1>Wrong Password</h1>"); }
        });
 
      }
  }
  catch(err){
      console.error(err.message);
  }
});


app.post("/leaveApplication",async(req,res)=>{

  try{

    var title = req.body.subject;
    var startDate = req.body.startDate;
    var nod = req.body.nod;
    var content = req.body.content;

    var design = await pool.query(
      "SELECT desig,dept FROM Faculty WHERE facid=$1",[FacID]
    );

    var App_id= await pool.query(
      "SELECT AppID FROM Track_of_ID"
    );
    AppID= App_id.rows[0].appid;
    

    if(design.rows[0].desig=='Faculty')
    {
      temp=0;

      var leave_data = await pool.query(
        "INSERT INTO LeaveApp (FacID,AppID,Title,StartDate,NOD,Content,AppStatus) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
        [FacID,AppID,title,startDate,nod,content,temp]
      );

      temp = await pool.query(
        "SELECT insert_leaveApp($1)",[AppID]
      );

      if(design.rows[0].dept=='Computer Science')
      {
        temp = await pool.query(
          "INSERT INTO HOD_CS (pendingapp,appstatus) VALUES ($1,0)",[AppID]
        );
      }
      else if(design.rows[0].dept=='Electrical')
      {
        temp = await pool.query(
          "INSERT INTO HOD_EE (pendingapp,appstatus) VALUES ($1,0)",[AppID]
        );
      }
      else if(design.rows[0].dept=='Mechanical')
      {
        temp = await pool.query(
          "INSERT INTO HOD_ME (pendingapp,appstatus) VALUES ($1,0)",[AppID]
        );
      }
      else if(design.rows[0].dept=='Civil')
      {
        temp = await pool.query(
          "INSERT INTO HOD_CE (pendingapp,appstatus) VALUES ($1,0)",[AppID]
        );
      }
      res.redirect("/faculty_dashboard");
    }
    else if(design.rows[0].desig=='HOD' || design.rows[0].desig=='DFA')
    {
      temp=1;
      var leave_data = await pool.query(
        "INSERT INTO LeaveApp (FacID,AppID,Title,StartDate,NOD,Content,AppStatus,retro) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",
        [FacID,AppID,title,startDate,nod,content,temp,0]
      );
      var insDir = await pool.query(
        "INSERT INTO Director (pendingapp,appstatus) VALUES ($1,0)",[AppID]
      );
      res.redirect("/specialFacultyDashboard");
    }


    AppID++;
    const updateApp = await pool.query(
      "UPDATE Track_of_ID SET AppID=$1",
      [AppID]
    );

    
    // alert("Leave application submitted successfully");
    
   
  }
  catch(err){
    console.error(err.message);
  }
});

app.post("/faculty_application",async(req,res)=>{
 
});

app.post("/appoint",async(req,res)=>{
 try{
  var fid = req.body.fid;
  var dept = req.body.dept;

  var Dept = await pool.query(
    "SELECT Dept FROM Faculty WHERE FacID=$1",
    [fid]
  );

  

  if(Dept.rows[0].dept != dept)
  { res.send("<h1>Faculty is from another department</h1>"); }
  else
  {
    var desig = req.body.des;

    if(desig=='HOD')
    {
      var prev_hod = await pool.query(
        "SELECT FacID FROM Faculty WHERE Dept=$1 AND Desig='HOD'",
        [dept]
      );

      var pend = await pool.query(
        "SELECT appid FROM leaveapp WHERE facid=$1",[fid]
      );

      var updateFac = await pool.query(
        "UPDATE Faculty SET desig='HOD' WHERE FacID=$1",
        [fid]
      );

      if(prev_hod.rows.length!=0)
      {
        var prev_id = prev_hod.rows[0].facid;

        var updateFac = await pool.query(
          "UPDATE Faculty SET Desig='Faculty' WHERE FacID=$1",
          [prev_id]
        );

        var pendApp = await pool.query(
          "SELECT appid FROM leaveapp WHERE facid=$1 AND appstatus=1",[prev_id]
        );

        var deletedir = await pool.query(
          "DELETE FROM Director WHERE pendingapp=$1",[pendApp.rows[0].appid]
        );

        if(dept=='Computer Science')
        {
          var del = await pool.query(
            "DELETE FROM HOD_CS WHERE pendingapp=$1 AND appstatus=0",[pend.rows[0].appid]
          );

          
          var del = await pool.query(
            "DELETE FROM DFA WHERE pendingapp=$1",[pend.rows[0].appid]
          );

          var inserthod = await pool.query(
            "INSERT INTO HOD_CS (pendingapp,appstatus) VALUES ($1,0)",
            [pendApp.rows[0].appid]
          );

        }
        else if(dept=='Electrical')
        {
          var del = await pool.query(
            "DELETE FROM HOD_EE WHERE pendingapp=$1 AND appstatus=0",[pend.rows[0].appid]
          );

          var del = await pool.query(
            "DELETE FROM DFA WHERE pendingapp=$1",[pend.rows[0].appid]
          );

          var inserthod = await pool.query(
            "INSERT INTO HOD_EE (pendingapp,appstatus) VALUES ($1,0)",
            [pendApp.rows[0].appid]
          );

        }
        else if(dept=='Mechanical')
        {
          var del = await pool.query(
            "DELETE FROM HOD_ME WHERE pendingapp=$1 AND appstatus=0",[pend.rows[0].appid]
          );

          var del = await pool.query(
            "DELETE FROM DFA WHERE pendingapp=$1",[pend.rows[0].appid]
          );

          var inserthod = await pool.query(
            "INSERT INTO HOD_ME (pendingapp,appstatus) VALUES ($1,0)",
            [pendApp.rows[0].appid]
          );

         
        }
        else if(dept=='Civil')
        {
          var del = await pool.query(
            "DELETE FROM HOD_CE WHERE pendingapp=$1 AND appstatus=0",[pend.rows[0].appid]
          );

          var del = await pool.query(
            "DELETE FROM DFA WHERE pendingapp=$1",[pend.rows[0].appid]
          );

          var inserthod = await pool.query(
            "INSERT INTO HOD_CE (pendingapp,appstatus) VALUES ($1,0)",
            [pendApp.rows[0].appid]
          );

          
        }
      }

      
      

      var insertDir = await pool.query(
        "INSERT INTO Director (pendingapp,appstatus) VALUES ($1,0)",[pend.rows[0].appid]
      );

    }
    else if(desig=='DFA')
    {
      var prev_dfa = await pool.query(
        "SELECT FacID FROM Faculty WHERE Desig='Dean Faculty Affairs'"
      ); 

      if(prev_dfa.rows.length!=0)
      {
        var prev_id = prev_dfa.rows[0].facid;

        var updateFac = await pool.query(
          "UPDATE Faculty SET Desig=$1 WHERE FacID=$2",
          ["Faculty",prev_id]
        );

        var pendApp = await pool.query(
          "SELECT appid FROM leaveapp WHERE facid=$1 AND appstatus=1",[prev_id]
        );

        var deletedir = await pool.query(
          "DELETE FROM Director WHERE pendingapp=$1",[pendApp.rows[0].appid]
        );

        var inserthod = await pool.query(
          "INSERT INTO DFA (pendingapp,appstatus) VALUES ($1,0)",
          [pendApp.rows[0].appid]
        );

        var new_dfa= await pool.query(
          "SELECT appid FROM leaveapp WHERE facid=$1 AND appstatus<2",[fid]
        );

        var delete_dfa= await pool.query(
          "DELETE FROM DFA WHERE pendingapp=$1",[new_dfa.rows[0].appid]
        );

        var insertDir = await pool.query(
          "INSERT INTO Director (pendingapp) VALUES ($1)",[new_dfa.rows[0].appid]
        );
      }

      var updateFac = await pool.query(
        "UPDATE Faculty SET Desig=$1 WHERE FacID=$2",
        [desig,fid]
      );
      
    }
  }
  res.redirect("/specialFacultyDashboard");
 }
 catch(err){
  console.error(err.message);
 }
});

app.post("/comments/:appid/1",async(req,res)=>{
  try{
    var cont= req.body.content;
    AppID = req.params.appid;
    var sendto;
    var dept = await pool.query(
      "SELECT Dept,appstatus,desig FROM Faculty,leaveApp WHERE Faculty.FacID=$1 AND leaveApp.appid=$2",[FacID,AppID]
    );

    var stat = dept.rows[0].appstatus;
    var des = dept.rows[0].desig;
    dept = dept.rows[0].dept;
   
    if(des=='Faculty')
    {
      if(stat==0)
      { sendto= 'HOD'; }
      else if(stat==1)
      { sendto= 'DFA'; }
      else
      { sendto= 'Hello'; }
    }
    else if(des=='HOD')
    { sendto= 'Faculty'; }
    else if(des=='DFA')
    { sendto= 'DFA'; }


    if(sendto=='HOD')
    {
      sendto = await pool.query(
        "SELECT FacID FROM Faculty WHERE desig='HOD' AND Dept=$1",[dept]
      );
    }
    else if(sendto=='DFA')
    {
      sendto = await pool.query(
        "SELECT FacID FROM Faculty WHERE desig='DFA' AND Dept=$1",[dept]
      );
    }
    else
    {
      sendto = await pool.query(
        "SELECT FacID FROM Faculty WHERE desig='Faculty' AND Dept=$1",[dept]
      );
    }

    sendto = sendto.rows[0].facid;
    var comid = await pool.query(
      "SELECT CommentID from Track_of_Id"
    );
    temp= comid.rows[0].commentid;

    var insertComment = await pool.query(
      "INSERT INTO Comments (AppID,SendById,SendToId,Content,CommentID) VALUES ($1,$2,$3,$4,$5)",
      [AppID,FacID,sendto,cont,temp]
    );

    var updateComment = await pool.query(
      "UPDATE Track_of_Id SET CommentID=$1",[temp+1]
    );

    res.redirect("/comments/"+req.params.appid);
  }
  catch(err){
    console.error(err.message);
  }
}); 

app.post("/comments/:appid",function(req,res){
  res.redirect("/comments/"+req.params.appid);
});



app.post("/approve/:appid",async(req,res)=>{
  try{
    AppID= req.params.appid;
    var data = await pool.query(
      "SELECT l1.nod,l1.appstatus,f1.tnol,f1.facid FROM leaveapp l1,faculty f1 WHERE appid=$1 AND l1.facid=f1.facid",
      [AppID]
    );
    var stat = data.rows[0].appstatus;
    temp= data.rows[0].tnol;
    data= data.rows[0].nod;

    if(stat==0)
    {
      var dept = await pool.query(
        "SELECT f1.dept,f1.desig FROM Faculty f1,leaveapp l1 WHERE l1.appid=$1 AND l1.facid=f1.facid",[AppID]
      );
      dept= dept.rows[0].dept;

      if(dept=='Computer Science')
      {
        var updaterec = await pool.query(
          "UPDATE HOD_CS SET appstatus=1 WHERE pendingapp=$1",[AppID]
        );
      }
      else if(dept=='Electrical')
      {
        var updaterec = await pool.query(
          "UPDATE HOD_EE SET appstatus=1 WHERE pendingapp=$1",[AppID]
        );
      }
      else if(dept=='Mechanical')
      {
        var updaterec = await pool.query(
          "UPDATE HOD_ME SET appstatus=1 WHERE pendingapp=$1",[AppID]
        );
      }
      else if(dept=='Civil')
      {
        var updaterec = await pool.query(
          "UPDATE HOD_CE SET appstatus=1 WHERE pendingapp=$1",[AppID]
        );
      }
    
      var update = await pool.query(
        "UPDATE leaveapp SET appstatus=$1 WHERE appid=$2",[stat+1,AppID]
      );

      var insertdfa = await pool.query(
        "INSERT INTO DFA (pendingapp,appstatus) VALUES ($1,0)",[AppID]
      );
    }
    else if(stat==1)
    {
      var desig_fac = await pool.query(
        "SELECT desig FROM Faculty WHERE facid=$1",[FacID]
      );

    
      var update = await pool.query(
        "UPDATE leaveapp SET appstatus=$1 WHERE appid=$2",[stat+1,AppID]
      );

      var deleterec = await pool.query(
        "UPDATE DFA SET appstatus=1 WHERE pendingapp=$1",[AppID]
      );
  
      var deleterec = await pool.query(
        "UPDATE Director SET appstatus=1 WHERE pendingapp=$1",[AppID]
      );

      var retro = await pool.query(
        "SELECT retro FROM leaveapp WHERE appid=$1",[AppID]
      );

      if(retro.rows[0].retro == 1)
      {
        var insertdfa = await pool.query(
          "INSERT INTO Director (pendingapp,appstatus) VALUES ($1,0)",[AppID]
        );
      }

      
    }
    else if(stat==2)
    {
      var update = await pool.query(
        "UPDATE leaveapp SET appstatus=$1 WHERE appid=$2",[stat+1,AppID]
      );

      var deleterec = await pool.query(
        "UPDATE Director SET appstatus=1 WHERE pendingapp=$1",[AppID]
      );
    }

    var Appstatus= await pool.query(
      "SELECT appstatus,retro FROM leaveapp WHERE appid=$1",[AppID]
    );

    
    if(Appstatus.rows[0].appstatus==2 || Appstatus.rows[0].appstatus==3)
    {
      if(data>temp)
      {
        var query = await pool.query(
          "UPDATE leaveapp SET NOD=$1 WHERE appid=$2",[temp,AppID]
        );

        var cid = await pool.query(
          "SELECT commentid FROM track_of_id"
        );
          temp=0;
        query = await pool.query(
          "INSERT INTO comments (appid,sendbyid,sendtoid,content,commentid) values ($1,$2,$3,$4,$5)",
          [AppID,temp,data.rows[0].facid,'Not Enough leaves available',cid]
        );

        cid++;
        var update = await pool.query(
          "UPDATE track_of_id set commentid=$1",[cid]
        );
      }
    }
    res.redirect("/faculty_applications");
  }
  catch(err){
    console.error(err.message);
  }
});


app.post("/reject/:appid",async(req,res)=>{
  try{
    AppID= req.params.appid;
    var data = await pool.query(
      "SELECT l1.nod,l1.appstatus,f1.tnol FROM leaveapp l1,faculty f1 WHERE appid=$1 AND l1.facid=f1.facid",
      [AppID]
    );
    var stat = data.rows[0].appstatus;

    var update = await pool.query(
      "UPDATE leaveapp SET appstatus=-1 WHERE appid=$1",[AppID]
    );


    if(stat==0)
    {
      var dept = await pool.query(
        "SELECT f1.dept FROM Faculty f1,leaveapp l1 WHERE l1.appid=$1 AND l1.facid=f1.facid",[AppID]
      );
      dept= dept.rows[0].dept;

      if(dept=='Computer Science')
      {
        var updaterec = await pool.query(
          "UPDATE HOD_CS SET appstatus=-1 WHERE pendingapp=$1",[AppID]
        );
      }
      else if(dept=='Electrical')
      {
        var updaterec = await pool.query(
          "UPDATE HOD_EE SET appstatus=-1 WHERE pendingapp=$1",[AppID]
        );
      }
      else if(dept=='Mechanical')
      {
        var updaterec = await pool.query(
          "UPDATE HOD_ME SET appstatus=-1 WHERE pendingapp=$1",[AppID]
        );
      }
      else if(dept=='Civil')
      {
        var updaterec = await pool.query(
          "UPDATE HOD_CE SET appstatus=-1 WHERE pendingapp=$1",[AppID]
        );
      }
    
    }
    else if(stat==1)
    {
      var deleterec = await pool.query(
        "UPDATE DFA SET appstatus=-1 WHERE pendingapp=$1",[AppID]
      );

      var deleterec = await pool.query(
        "UPDATE Director SET appstatus=-1 WHERE pendingapp=$1",[AppID]
      );
 
    }
    else if(stat==2)
    {
      var deleterec = await pool.query(
        "UPDATE Director SET appstatus=-1 WHERE pendingapp=$1",[AppID]
      );
    }
    res.redirect("/faculty_applications");
  }
  catch(err){
    console.error(err.message);
  }
});

app.get("/projectApplication",function(req, res) {
  res.render("projectApplication");
});

app.post("/projectApplication", async (req, res) => {
  try {
    var HireID = await pool.query(
      "SELECT hireid FROM track_of_id"
    );
    HireID= HireID.rows[0].hireid;
    console.log(HireID);
    var sub = req.body.Title;
    var type = req.body.type;
    var dur = req.body.duration;
    var pid = req.body.Pid;
    var content = req.body.post;
    var role = await pool.query(
      "SELECT role from Faculty WHERE facid=$1",[FacID]
    );
    role= role.rows[0].role;
    if(role=='Project Instructor')
    {
      temp=1;

      const todo = await pool.query(
        "INSERT INTO hireapp (facID,HireID,Title,type,pid,Duration,Content,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",
        [FacID,HireID,sub,type,pid,dur,content,temp]
      );

      var data = await pool.query(
        "INSERT INTO DSA (pendingapp,appstatus) VALUES ($1,0)",[HireID]
      );
    }
    else if(role=='CO Project Instructor')
    {
      temp=0;
      const todo = await pool.query(
        "INSERT INTO hireapp (facID,HireID,Title,type,pid,Duration,Content,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",
        [FacID,HireID,sub,type,pid,dur,content,temp]
      );

      var pi = await pool.query(
        "SELECT f1.facid FROM Faculty f1,hireapp h1 WHERE h1.hireid=$1 AND h1.pid=f1.pid AND f1.role='Project Instructor'",[HireID]
      );

      var data = await pool.query(
        "INSERT INTO instruc (pi,pendingapp,appstatus) VALUES ($1,$2,0)",[pi.rows[0].facid,HireID]
      );
    }
  
    

    HireID++;
    temp = await pool.query(
      "UPDATE track_of_id SET hireid=$1",[HireID]
    );


    res.redirect("/faculty_dashboard");
  } catch (err) {
    console.log(err);
  }
});



app.post("/approved/:hireid",async(req,res)=>{
  try{
    HireID= req.params.hireid;

    var data = await pool.query(
      "SELECT l1.type,l1.duration,l1.status FROM hireapp l1,faculty f1 WHERE l1.hireid=$1 AND l1.facid=f1.facid",
      [HireID]
    );
    var stat = data.rows[0].status;

    if(stat==0)
    {
      var dept = await pool.query(
        "SELECT h1.pid,f1.facid FROM Faculty f1,hireapp h1 WHERE h1.hireid=$1 AND h1.pid=f1.pid AND f1.role='Project Instructor'",[HireID]
      );
      dept= dept.rows[0].dept;

      
        var updaterec = await pool.query(
          "UPDATE instruc SET appstatus=1 WHERE pendingapp=$1",[HireID]
        );
  
    
      var update = await pool.query(
        "UPDATE Hireapp SET status=$1 WHERE hireid=$2",[stat+1,HireID]
      );

      var insertdfa = await pool.query(
        "INSERT INTO DSA (pendingapp,appstatus) VALUES ($1,0)",[HireID]
      );
    }
    else if(stat==1)
    {
    
      var update = await pool.query(
        "UPDATE hireapp SET status=2 WHERE hireid=$1",[HireID]
      );

      var deleterec = await pool.query(
        "UPDATE DSA SET appstatus=1 WHERE pendingapp=$1",[HireID]
      );
            
    }
    res.redirect("/hiringApplications");
  }
  catch(err){
    console.error(err.message);
  }
});


app.post("/rejected/:hireid",async(req,res)=>{
  try{
    HireID= req.params.hireid;
    var data = await pool.query(
      "SELECT l1.status FROM hireapp l1,faculty f1 WHERE l1.hireid=$1 AND l1.facid=f1.facid",
      [HireID]
    );
    var stat = data.rows[0].status;

    var update = await pool.query(
      "UPDATE hireapp SET status=-1 WHERE hireid=$1",[HireID]
    );

    if(stat==0)
    {
      var updaterec = await pool.query(
        "UPDATE Instruc SET appstatus=-1 WHERE pendingapp=$1",[HireID]
      );
    }
    else if(stat==1)
    {
      var deleterec = await pool.query(
        "UPDATE DSA SET appstatus=-1 WHERE pendingapp=$1",[HireID]
      );
    }
    
    res.redirect("/hiringApplications");
  }
  catch(err){
    console.error(err.message);
  }
});

app.post("/logout",function(req,res){
  FacID=0;
  res.redirect("/");
});

// -------------------------------------------------- MONGO DB --------------------------------------------------------

app.get("/:title",async(req,res)=>{
  try{
    var title = req.params.title;

    temp = await pool.query(
      "SELECT FacID,FacName FROM Faculty WHERE Dept=$1 ORDER BY FacID",[title]
    );

    // console.log(temp.rows);
    
    res.render("department",{
      App:temp.rows,
      title: title
    });
  }
  catch(err){
    console.error(err.message);
  }
});

app.get("/:title/:facname",function(req,res){
  var title = req.params.title;
  var facname = req.params.facname;

  var pub=[],courses=[],bg='';

  Faculty.findOne({name: facname},function(err,doc){
    bg=doc.background;
    pub=doc.Publication;
    courses=doc.courses;

    res.render("faculty",{
      name:facname,
      back:bg,
      pub:pub,
      courses:courses
    });

  });
  
});


app.post("/background",function(req,res){
  var bg = req.body.background;
  var name='',pub=[],courses=[];

  Faculty.findOne({facid: FacID},function(err,doc){
    name = doc.name;
    pub = doc.Publication;
    courses = doc.courses;

    // console.log("name: ",name);
    // console.log("Publications: ",pub);
    // console.log("Courses: ", courses);
    // console.log("Background: ", bg);

    if(bg!='')
    {
      Faculty.updateOne(
        {facid: FacID},
        {facid: FacID, name: name,background: bg,Publication: pub, courses: courses},
        function(err){
          if(!err)
          { 
            console.log("background updated"); 
            res.redirect("/myProf");
          }
          else
          { console.log(err); }
      });
    }
    else{
      res.redirect("/myProf");
    }
  });

  
});

app.post("/publications",function(req,res){
  // var pub=[];
  var pub = req.body.publication;

  if(pub!='')
  {
    var all_pub=[],name='',bg='',courses=[];
    Faculty.findOne({facid: FacID},function(err,doc){
      all_pub = doc.Publication;
      
      // console.log("Previous all_pub Publications: ",all_pub);
      all_pub.push(pub);
      name = doc.name;
      bg = doc.background;
      courses = doc.courses; 

      // console.log("name: ",name);
      
      // console.log("Updated Publications: ",all_pub);
      // console.log("Courses: ", courses);
      // console.log("Background: ", bg);

      Faculty.updateOne(
        {facid: FacID},
        {facid: FacID,name: name, background: bg,Publication: all_pub,courses: courses},
        function(err){
          if(!err)
          { 
            console.log("Publications updated"); 
            res.redirect("/myProf");
          }
          else
          { console.log(err); }
      });
    });
  }
  else
  {
    res.redirect("/myProf");
  }

  
});

app.post("/courses",function(req,res){
  var course = req.body.course;

  if(course!='')
  {
    var all_courses=[],name='',bg='',pub=[];

    Faculty.findOne({facid: FacID},function(err,doc){
      all_courses = doc.courses;
      all_courses.push(course);
      name = doc.name;
      bg = doc.background;
      pub = doc.Publication;

      // console.log("name: ",name);
      // console.log("Publications: ",pub);
      // console.log("Courses: ", all_courses);
      // console.log("Background: ", bg);

      Faculty.updateOne(
        {facid: FacID},
        {facid: FacID, name: name, background: bg, Publication: pub, courses: all_courses},
        function(err){
          if(!err)
          { 
            console.log("courses updated"); 
            res.redirect("/myProf");
          }
          else
          { console.log(err); }
      });
    });
  }
  else{
    res.redirect("/myProf");
  }

  
});


app.post("/background/1",function(req,res){
  var all_courses=[],name='',pub=[];

  Faculty.findOne({facid: FacID},function(err,doc){
    all_courses = doc.courses;
    name = doc.name;
    pub = doc.Publication;

    Faculty.updateOne(
      {facid: FacID},
      {facid: FacID, name: name, background: "", Publication: pub, courses: all_courses},
      function(err){
        if(!err)
        { 
          console.log("background removed"); 
          res.redirect("/myProf");
        }
        else
        { console.log(err); }
    });
  });
});


app.post("/publication/:content",function(req,res){
  var content = req.params.content;
  var courses=[],name='',pub=[],bg='';

  Faculty.findOne({facid: FacID},function(err,doc){
    courses = doc.courses;
    name = doc.name;
    bg = doc.background;
    pub = doc.Publication;

    for(i=0;i<pub.length;i++)
    {
      if(pub[i]==content)
      { 
        pub.splice(i,1);
        break;
      }
    }

    Faculty.updateOne(
      {facid: FacID},
      {facid: FacID, name: name, background: bg, Publication: pub, courses: courses},
      function(err){
        if(!err)
        { 
          console.log("publication removed"); 
          res.redirect("/myProf");
        }
        else
        { console.log(err); }
    });
  });
});


app.post("/courses/:content",function(req,res){
  var content = req.params.content;
  var courses=[],name='',bg='',pub=[];

  Faculty.findOne({facid: FacID},function(err,doc){
    courses = doc.courses;
    name = doc.name;
    bg = doc.background;
    pub = doc.Publication;

    for(i=0;i<courses.length;i++)
    {
      if(courses[i]==content)
      { 
        courses.splice(i,1);
        break;
      }
    }

    Faculty.updateOne(
      {facid: FacID},
      {facid: FacID, name: name, background: bg, Publication: pub, courses: courses},
      function(err){
        if(!err)
        { 
          console.log("course removed"); 
          res.redirect("/myProf");
        }
        else
        { console.log(err); }
    });
  });
});


app.listen(4000, function() {
  console.log("server is running on 4000 port");
});