const http = require('http');
const fs = require('fs');
const readline = require('readline');
const stream   = require('stream');
const { start } = require('repl');
var spawn = require("child_process").spawn;


/* START functions needed at boot */
function parseBool(payload){
  if(payload == 'Y' || payload == 'true'){return true;}
  else if(payload == 'N' || payload == 'false'){return false;}
  else{return false;}
}

function addZero(obj){
  if(parseInt(obj) < 10){f_obj = "0"+obj.toString();return f_obj;}
  else{return obj};
}

function friendlyTimestamp(method){
  if(method == null){
    method = 0;
  }
  var ct = new Date;
  var fts_time;
  var fts_date;
  var fts_full;
  //switch Start
  //switch End
  fts_date = "["+ct.getFullYear().toString()+"-"+addZero(ct.getMonth()+1).toString()+"-"+addZero(ct.getDate()).toString()+"]"
  fts_time = "["+addZero(ct.getHours()).toString()+":"+addZero(ct.getMinutes()).toString()+":"+addZero(ct.getSeconds()).toString()+"]";
  fts_full = fts_date + " " + fts_time;
  switch(method){
    case (0):
      return fts_full;
      break;
    case (1):
      return fts_date;
      break;
    case (2):
      return fts_time;
      break;
    default:
      return fts_full;
      break;
  }
}

function readProperties(){
  minecraft_server_properties = fs.readFileSync("server.properties").toString();
}

/* END functions needed at boot*/

/* CHECK IF IN TESTING*/
try{
  var testing = parseBool(fs.readFileSync("testing").toString())
}
catch{
  var testing = false;
}
var verbose_testing = false;
/* CHECK IF IN TESTING*/


/* START color data */
/* START failsafes */
var web_color_selection = [1,1,1,1]
var web_color_main = "rgba(1,1,1,1)";
var web_color_accent_1 = "rgba(1,1,1,0.9)";
var web_color_accent_2 = "rgba(1,1,1,0.8)"; 
var web_color_static;
/* END failsafes */

/* update color func */
function update_web_colors(){
  web_color_main = "rgba("+web_color_selection[0]+","+web_color_selection[1]+","+web_color_selection[2]+",1)"
  web_color_accent_1 = "rgba("+web_color_selection[0]+","+web_color_selection[1]+","+web_color_selection[2]+",0.9)"
  web_color_accent_2 = "rgba("+web_color_selection[0]+","+web_color_selection[1]+","+web_color_selection[2]+",0.8)"
  if(verbose_testing){
    console.log(friendlyTimestamp()+" [INTERNAL] web_color_main: "+web_color_main)
    console.log(friendlyTimestamp()+" [INTERNAL] web_color_accent_1: "+web_color_accent_1)
    console.log(friendlyTimestamp()+" [INTERNAL] web_color_accent_2: "+web_color_accent_2)
  }
}

/* random color func */
function randomize_web_color(){
  var rand = (Math.floor(Math.random() * ((web_color_presets.length-1) - 0 + 1) ) + 0);
  web_color_selection = web_color_presets[rand]
  if(verbose_testing){
    console.log(friendlyTimestamp()+" [INTERNAL] web color randomized to: "+web_color_selection+" ("+rand.toString()+")");
  }
  update_web_colors();
}

var web_color_presets = [
  [255,175,20,1],     //0  orange
  [110,160,255,1],    //1  lightBlue
  [240,30,100,1],     //2  pink
  [120,30,100,1],     //3  darkPurple
  [25,180,75,1],      //4  green
  [150,245,245,1],    //5  teal
  [105,40,10,1],      //6  brown
  [0,255,50,1],       //7  lime
  [185,115,220,1],    //8  lightPurple
  [35,20,130,1],      //9  darkBlue
  [255,255,255,1],    //10 white
  [126,126,126,1],    //11 grey
  [255,145,165,1]     //12 lightSalmon
]
try{
  web_color_selection = web_color_presets[parseInt(fs.readFileSync("web_color").toString())];
  if(testing){
    console.log(friendlyTimestamp()+" [INTERNAL] web color set to: "+web_color_selection);
  }
  web_color_static = true;
}
catch{
 /* var web_color_selection = web_color_presets[11]; */
 randomize_web_color();
 web_color_static = false;
}
update_web_colors();
/* END color data */

const letY = 'Y'
const letN = 'N'
var tog;

var do_backup = true;
var do_reboot = true;
var whitelist = false;
var do_shutdown = true;
var allow_player_requests = true;
var backup_safe_lock = false;
var player_check_timer = 0;
var last_save_time = 0;
var last_player_check = (new Date).getTime();
var pl_chk_now = last_player_check;
var online_players = 0;
var playerCheckInterval;

const backup_loc = '../backups/'
const seven_zip_loc = 'C:\\Programs\\7za\\7za.exe'

var minecraft_server;
readProperties();
//Read server RAM config.
try{
  var minecraft_server_ram = fs.readFileSync("server.ram").toString()
}
catch(err){
  console.log(friendlyTimestamp()+" [ERROR] node:"+err.toString());
  console.log(friendlyTimestamp()+" [INTERNAL] node: Defaulting to Xmx4G");
  fs.writeFileSync("server.ram",'Xmx4G');
  var minecraft_server_ram = 'Xmx4G';
}

//Read server host_adress config.
try{
  var host_address = fs.readFileSync("server_host_address").toString();
}
catch(err){
  console.log(friendlyTimestamp()+" [ERROR] node:"+err.toString());
  console.log(friendlyTimestamp()+" [INTERNAL] node: Defaulting to localhost.");
  console.log(friendlyTimestamp()+" [INTERNAL] node: Change the url in 'server_host_address'.")
  fs.writeFileSync("server_host_address",'localhost')
}

//Read minecraft port from file.
const minecraft_server_port = parseInt(((minecraft_server_properties.match(/(?:server\-port\=)(\d*)/g)).toString().replace(/[^0-9]/g,"")));
if(testing){
  var web_server_port = 25551
}else{
  var web_server_port = minecraft_server_port+1
}
var minecraft_version = {
  stored : "undefined",
  read : function(){
    try{
      this.stored = fs.readFileSync("minecraft_version").toString()
      return(this.stored)
    }
    catch{
      console.log(friendlyTimestamp()+" [INTERNAL] [ERROR] Failed to read minecraft version.");
    }
  },
  update : function(version){
    this.stored = version
    fs.writeFileSync("minecraft_version",version)
    console.log(friendlyTimestamp()+" [INTERNAL] Updated minecraft_version.stored to "+this.stored);
  }
}

minecraft_version.read()

var seven_zip;
var max_players = parseInt(((minecraft_server_properties.match(/(?:max\-players\=)(\d*)/g)).toString().replace(/[^0-9]/g,"")));
var server_version = fs.readFileSync("version").toString();
var listMessage = '[<red_text>Offline</red_text>] There are 0 out of '+max_players.toString()+' players online.'
var server_running = false;
var last_exit = 0
var current_server_versions = [];
var web_updater;
var working_data;
var tempData = [];
var conLog = [];
try{
  server_name = fs.readFileSync("server_name").toString()
}
catch{
  var server_name = __dirname;
  server_name = server_name.split("\\")
  server_name = server_name[(server_name.length-1)];
}

var discord_link;
var discord_available;
try{
 discord_link = fs.readFileSync("discord").toString()
 discord_available = true;
}
catch{
 discord_available = false;
}

/* START failsafes */
var style_data = '<style></style>'
var base_html = '<html><head><title>'+server_name+'</title>'+style_data+'</head><body><div id=container>'
/* END failsafes */
function gen_style_data(return_data){
  var style_data = '<style>'
  style_data += '@import url("https://fonts.googleapis.com/css?family=Open+Sans");*{margin:0; overflow:hidden; font-family:"Open Sans" !important;}'
  style_data += 'body{background-color:rgb(33, 33, 33);}'
  style_data += '#log_div{margin:0 auto;max-width:80vw;min-height:200px;max-height:200px;overflow-y:scroll;border:solid 1px;background-color: rgba(15,15,15,1);}'
  style_data += '#interface_div{margin:0 auto;max-width:80vw;color:'+web_color_main.toString()+';}'
  style_data += '#log_info{margin:0 auto;max-width:80vw;color:'+web_color_main.toString()+';}'
  style_data += '.log_line{font-size:12px;}'
  style_data += '.log_line:last-child{font-size:12px;font-weight:bold;}'
  style_data += '.log_line:nth-child(1n+0){background-color:'+web_color_accent_1.toString()+';}'
  style_data += '.log_line:nth-child(2n+0){background-color:'+web_color_accent_2.toString()+';}'
  style_data += 'green_text{color:#5F5;}'
  style_data += 'red_text{color:#F55;}'
  style_data += 'main_color{color:'+web_color_main.toString()+';}'
  style_data += '</style>'
  var base_html = '<html><head><title>'+server_name+'</title>'+style_data+'</head><body><div id=container>'
  if(return_data){
   return base_html;
  }
}
var interface_div_start = '<div id="interface_div">'
var interface_div_content;
function gen_interface_div_content(return_data){
interface_div_content = "";
interface_div_content += '<h1>'+server_name+'</h1>'+'<br/>';
//online
interface_div_content += 'Server is currently running: ';
if(server_running == true){
  interface_div_content += '<green_text>'+server_running.toString()+'</green_text><br/>';
  interface_div_content += '<a href="http://'+host_address+":"+web_server_port+'/refresh"><button>Refresh page.</button></a>'
}
else{
  interface_div_content += '<red_text>'+server_running.toString()+'</red_text>';
  if(allow_player_requests){
    interface_div_content += '<br/><a href="http://'+host_address+":"+web_server_port+'/start"><button>Request to start the server.</button></a>'
  }
}
interface_div_content +='<br/>';
//open
interface_div_content += 'Server is currently open: ';
if(whitelist == false){
  interface_div_content += '<green_text>'+(!whitelist).toString()+'</green_text>';
}
else{
  interface_div_content += '<red_text>'+(!whitelist).toString()+'</red_text>';
}
interface_div_content +='<br/>';
//reboot
interface_div_content += 'Auto-restart is on: ';
if(do_reboot == true){
  interface_div_content += '<green_text>'+do_reboot.toString()+'</green_text>';
}
else{
  interface_div_content += '<red_text>'+do_reboot.toString()+'</red_text>';
}
interface_div_content +='<br/>';
//backup
interface_div_content += 'Backups are being made: ';
if(do_backup == true){
  interface_div_content += '<green_text>'+do_backup.toString()+'</green_text>';
}
else{
  interface_div_content += '<red_text>'+do_backup.toString()+'</red_text>';
}
interface_div_content +='<br/>';
//auto shutdown
interface_div_content += 'Server is automatically shutting down from inactivity: ';
if(do_shutdown == true){
  interface_div_content += '<green_text>'+do_shutdown.toString()+'</green_text>';
}
else{
  interface_div_content += '<red_text>'+do_shutdown.toString()+'</red_text>';
}
interface_div_content +='<br/>';
interface_div_content +='<br/>';
//server version
interface_div_content += 'Server jar is: '+(server_version.toString())+'<br/>';
interface_div_content += 'Server version is: '+minecraft_version.read()+'<br/>'
interface_div_content += '<br/>'
//server connection details
interface_div_content += 'Server connection details: <b>voip.fetafisken.se:'+(minecraft_server_port).toString()+'</b><br/>';
//players online
interface_div_content += listMessage + "<br/>"
interface_div_content += '<br/>'
//discord
if(discord_available){
  interface_div_content += 'Discord: <a href="'+ discord_link +'" target="__blank">'+ discord_link +'</a><br/>'
}
if(return_data){
  return interface_div_content;
}
}
var interface_div_end = '</div><br/><br/>'

var log_div = '<div id="log_div">'
var log_div_end =  '</div>'
var end_html = '</div><script>logItems = document.querySelectorAll(".log_line");lastLogItem = logItems[logItems.length-1];setTimeout(function(){lastLogItem.scrollIntoView()}, 500);</script></body></html>'

//setTimeout(function(){lastLogItem.scrollIntoView()}, 500)

function toggleFile(file,state){
  console.log(friendlyTimestamp()+" [INTERNAL] toggleFile("+file+","+state+")");
  fs.writeFile(file, state, (err) => {
    if (err) throw err;
  });
}

function readVersion(ver){
  if(ver){
  toggleFile('./version', current_server_versions[ver]);
  server_version = current_server_versions[ver];
  console.log(friendlyTimestamp()+" [INTERNAL] node: Server version switched to: "+server_version);
  }
  else{
    console.log(friendlyTimestamp()+" [INTERNAL] node: Server version is currently set to: "+server_version);
    var serv_temp = fs.readdirSync(".");
    current_server_versions = []
    console.log(friendlyTimestamp()+" [INTERNAL] node: Server versions available:");
    for(ix=0;ix<serv_temp.length;ix++){
      if(serv_temp[ix].match(/.*\.jar/g)){
        current_server_versions.push(serv_temp[ix]);
      }
    }
    for(ix=0;ix<current_server_versions.length;ix++){
      console.log(friendlyTimestamp()+" [INTERNAL] node: "+ix+": "+current_server_versions[ix]);
    }
  }
}

var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

//NODE STUFF
process.on('uncaughtException', (err, origin) => {
  console.log(friendlyTimestamp()+" [ERROR] node: "+err)
  console.log(friendlyTimestamp()+" [ERROR] node: "+origin)
});

process.on('typeError', (err, origin) => {
  console.log(friendlyTimestamp()+" [ERROR] node: "+err)
  console.log(friendlyTimestamp()+" [ERROR] node: "+origin)
});

/* NODE LOGS */
function connectionLog(data){
  /* make sure log folder exists */
  try {
    if (!fs.existsSync("node_logs")) {
      fs.mkdirSync("node_logs")
    }
  } catch (err) {
    console.log(friendlyTimestamp()+" [ERROR] node: "+err)
    return;
  }

  /* write connection streams to file */
  try{
    return;
  }
  catch{
    return;
  }
}
//END NODE STUFF

function update_variables(){
  readProperties();
  //listMessage = '[<red_text>Offline</red_text>] There are 0 out of '+max_players.toString()+' players online.'

  //read reboot
  try{
    do_reboot = parseBool(fs.readFileSync("reboot").toString());
  }
  catch(err){
    console.log(friendlyTimestamp()+" [ERROR] node:"+err.toString());
    console.log(friendlyTimestamp()+" [INTERNAL] node: Defaulting to false");
    fs.writeFileSync("reboot",letN);
    do_reboot = false;
  }

  //read backup
  try{
    do_backup = parseBool(fs.readFileSync("backup").toString());
  }
  catch(err){
    console.log(friendlyTimestamp()+" [ERROR] node:"+err.toString());
    console.log(friendlyTimestamp()+" [INTERNAL] node: Defaulting to false");
    fs.writeFileSync("backup",letN);
    do_backup = false;
  }

  //read shutdown
  try{
    do_shutdown = parseBool(fs.readFileSync("shutdown").toString());
  }
  catch(err){
    console.log(friendlyTimestamp()+" [ERROR] node:"+err.toString());
    console.log(friendlyTimestamp()+" [INTERNAL] node: Defaulting to false");
    fs.writeFileSync("shutdown",letN);
    do_shutdown = false;
  }

  //read timer
  try{
    player_check_timer = parseInt(fs.readFileSync("player_check_timer").toString());
  }
  catch(err){
    console.log(friendlyTimestamp()+" [ERROR] node:"+err.toString());
    console.log(friendlyTimestamp()+" [INTERNAL] node: Defaulting to 60000");
    fs.writeFileSync("player_check_timer",'3600000');
    player_check_timer = 3600000
  }

  //read allow_player_requests
  try{
    allow_player_requests = parseBool(fs.readFileSync("allowRequests").toString());
  }
  catch(err){
    console.log(friendlyTimestamp()+" [ERROR] node:"+err.toString());
    console.log(friendlyTimestamp()+" [INTERNAL] node: Defaulting to true");
    fs.writeFileSync("allowRequests",letY);
    allow_player_requests = true
  }

  minecraft_version.read()

  
  
  whitelist = parseBool((minecraft_server_properties.match(/white\-list\=\w+/g)).toString().replace("white\-list\=",""))
  console.log(friendlyTimestamp()+" [INTERNAL] "+"do_reboot: "+do_reboot.toString())
  console.log(friendlyTimestamp()+" [INTERNAL] "+"do_backup: "+do_backup.toString())
  console.log(friendlyTimestamp()+" [INTERNAL] "+"do_shutdown: "+do_shutdown.toString())
  console.log(friendlyTimestamp()+" [INTERNAL] "+"whitelist: "+whitelist.toString())
  console.log(friendlyTimestamp()+" [INTERNAL] "+"allow_player_requests: "+allow_player_requests.toString())
  console.log(friendlyTimestamp()+" [INTERNAL] "+ "minecraft_version.stored: "+minecraft_version.stored)
}

//loop the player check function
function playerCheckWait(){
  pl_chk_now = (new Date).getTime()
  if(pl_chk_now > ((last_player_check+player_check_timer)*0.9)){
    playerCheck(1)
  }else{
    console.log(friendlyTimestamp()+" [INTERNAL] Sever was recently checked, skipping.")
    return;
  }
}

//stagger stage 2 execution
function playerCheckStage2(){
  playerCheck(2)
}

function playerCheck(stage){
  last_player_check = (new Date).getTime();
  if(stage == 1){
    if(server_running){
      console.log(friendlyTimestamp()+" [INTERNAL] Checking player count.")
      minecraft_server.stdin.write("save-all\n");
      playerQuery()
      setTimeout(playerCheckStage2,1000);
      return;
    }else{
      console.log(friendlyTimestamp()+" [INTERNAL] Server isn't running, skipping player check.")
      return;
    }
  }
  if(stage==2){
    if(online_players > 0){
      console.log(friendlyTimestamp()+" [INTERNAL] There are "+online_players.toString()+" players on the server, skipping.")
      return;
    }else if((new Date).getTime() <= last_save_time+55000){
      console.log(friendlyTimestamp()+" [INTERNAL] Server empty, shutting down.")
      minecraft_server.stdin.write("stop\n");
      return;
    }else{
      if((new Date).getTime() > last_save_time+60000){
        console.log(friendlyTimestamp()+" [INTERNAL] Server not saved within 60 seconds, aborting.")
        return;
      }
      console.log(friendlyTimestamp()+" [INTERNAL] Server not saved within 10 seconds, trying again.")
      setTimeout(playerCheckStage2,1000);
      return;
    }
  }
}

//parse node commands
function parseNodeCommands(command){
  if(command == "dump_vars"){
    console.log("\n"+friendlyTimestamp()+" [INTERNAL] START vars")
    if(tog == null){console.log("tog: undefined");}
    if(tog != null){console.log("tog: "+tog.toString())};
    console.log("do_backup: "+do_backup.toString());
    console.log("do_reboot: "+do_reboot.toString());
    console.log("whitelist: "+whitelist.toString());
    console.log("allow_player_requests: "+allow_player_requests.toString());
    console.log("minecraft_server_port: "+minecraft_server_port.toString());
    console.log("server_name: "+server_name.toString());
    console.log("server_version: "+server_version.toString());
    console.log("server_running: "+server_running.toString());
    if(tempData.length >= 1){console.log("tempData.length: " + tempData.length.toString())}
    if(tempData[tempData.length-1] == null){console.log("tempData[tempData.length-1]: undefined");}
    if(tempData[tempData.length-1] != null){console.log("tempData[tempData.length-1]: "+tempData[tempData.length-1].toString())};
    if(conLog.length >= 1){console.log("conLog.length: " + conLog.length.toString())}
    if(conLog[conLog.length-1] == null){console.log("conLog[conLog.length-1]: undefined");}
    if(conLog[conLog.length-1] != null){console.log("conLog[conLog.length-1]: "+conLog[conLog.length-1].toString())};
    console.log(friendlyTimestamp()+" [INTERNAL] END vars")
    console.log("\n")
  }
  else if(command == "tempData"){
    for(ix=0;ix<tempData.length;ix++){
      console.log("tempData["+ix.toString()+"]: "+tempData[ix]);
    }
  }
  else if(command == "purge" || command == "clear"){
    tempData = [];
  }
  else if(command == "verbose"){
    verbose_testing = !verbose_testing;
    console.log(friendlyTimestamp()+" [INTERNAL] verbose_testing: "+verbose_testing)
  }
  else if (command == "testing"){
    console.log(friendlyTimestamp()+" [INTERNAL] testing: "+testing)
  }
  else if (command == "friendlyTimeStamp"){
    console.log(friendlyTimestamp() + " "+ friendlyTimestamp.toString())
  }
  else{return}
}

console.clear()

function start_minecraft_server(){
  server_running = !server_running;
  minecraft_server = spawn("java.exe",['-Dfile.encoding=UTF-8', "-server", "-Xms2G", "-"+minecraft_server_ram, "-XX:+UseParallelGC", "-d64" ,  "-jar", server_version, "nogui"]);
  if(do_shutdown){
    console.log(friendlyTimestamp()+" [INTERNAL] Running player check every "+(player_check_timer/1000)+" seconds");
    try{  
      playerCheckInterval = setInterval(playerCheckWait,player_check_timer);
    }
    catch(err){
      console.log(friendlyTimestamp()+" [ERROR] node:"+err.toString());
    }
  }
  minecraft_server.stdout.on("data",function(data){
    var working_data = data.toString().split(/(?=\[(?:[0-9]+.){1,3}\])/g);
    for(ix=0;ix<working_data.length;ix++){
    /* scrub carriage return and newline */
    working_data[ix] = friendlyTimestamp(1) + " " + working_data[ix].replace(/(\r?\n)/g,"");
    /* shift array */
    if(tempData.length >= 200){tempData.shift()}
    /* check list every time someone joins or leaves */
    if(working_data[ix].match(/\[.+\/INFO\].+(?:joined|left|done.+\"help\").+/gi)){
      playerQuery();
    }
    if(working_data[ix].match(/.+UUID\sof\splayer.+|.+logged\sin.+|.+[joined|left]\sthe\sgame|.+lost\sconnection:.+/gi)){
      conLog.push(working_data[ix])
    }
    /* update list when server is finished booting */
    if(working_data[ix].match(/\[.+\/INFO\].+done.+\"help\"/gi)){
      playerQuery();
    }
    /* scrub attribute spam */
    if(working_data[ix].match(/.+Ignoring unknown attribute.+/g)){}
    /* handle list command */
    else if(working_data[ix].match(/There are \d{1,3} of a max of 100 players online:/g)){
      listMessage = friendlyTimestamp()+" "+working_data[ix].match(/There are \d{1,3} of a max of 100 players online:/g)+'.'
      online_players = parseInt(working_data[ix].match(/There\sare\s(\d{1,3})\sof\sa\smax\sof\s100\splayers\sonline/)[1]);
      console.log(friendlyTimestamp()+" [INTERNAL] [INFO] online_players: "+online_players.toString())
      console.log(working_data[ix].toString());
    }
    /* update last save time */
    else if(working_data[ix].match(/.+server\sthread\/INFO.+saved\sthe\sgame/g)){
      last_save_time = (new Date).getTime()
    }
    else if(working_data[ix].match(/.+Fetching\spacket\sfor\sremoved\sentity.+/g)){
      console.log(friendlyTimestamp()+" [INTERNAL] [SPAM] Removed entity packet.")
    }
    else if(working_data[ix].match(/Starting\sminecraft\sserver\sversion(.+)$/)){
      var tmpMCVer = working_data[ix].match(/Starting\sminecraft\sserver\sversion(.+)$/)[1]
      if(minecraft_version.stored != tmpMCVer){
        minecraft_version.update(tmpMCVer);
      }
      tempData.push(working_data[ix].toString());
    }
    /* discard empty messages */
    else if(working_data[ix] == ""){}
    /* prepare message for web & send to log*/
    else{
      console.log(working_data[ix].toString());
      /* working_data[ix] = working_data[ix].replace(/id\=\S+\,/g,"[REDACTED]"); */
      if(working_data[ix].match(/you whisper to .+\:/gi)){
        /* scrub whispers */
        working_data[ix] = working_data[ix].replace(/.+/,"[REDACTED]");
      }
      /* working_data[ix] = working_data[ix].replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,""); */
      if(working_data[ix].match(/UUID.+?(\S{8}-\S{4}-\S{4}-\S{4}-\S{12})/g)){
        working_data[ix] = working_data[ix].replace(/(\S{8}-\S{4}-\S{4}-\S{4}-\S{12})/g,"[REDACTED]")
      }else if(working_data[ix].match(/\[\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d{0,5}\]/g)){
        working_data[ix] = working_data[ix].replace(/\[\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d{0,5}\]/g,"[REDACTED]")
      }
      tempData.push(working_data[ix].toString());
      }
    }
  });
  minecraft_server.stderr.on("data",function(data){
      console.log("[ERROR] java: " + data);

  });
  minecraft_server.on("exit",function(){
    last_exit = (new Date).getTime()
    server_running = !server_running;
    try{
      clearInterval(playerCheckInterval);
    }
    catch(err){
      console.log(friendlyTimestamp()+" [ERROR] node:"+err.toString());
    }
    listMessage = '[<red_text>Offline</red_text>] There are 0 out of '+max_players.toString()+' players online.'
    console.log(friendlyTimestamp()+" [INFO] java: Minecraft server ["+server_version+"] has been shut down.")
    update_variables();
    if(do_backup == true){start_backup();}
  });
    minecraft_server.stdin.end; //end input
}

function start_backup(){
  //LOCK RESTART REQUESTS UNTIL DONE.
  backup_safe_lock = true;
//RENAME AND REMOVE
if((fs.existsSync(backup_loc+server_name+"_7.7z"))){
  console.log(friendlyTimestamp()+" [INTERNAL] backup: Removing "+backup_loc+server_name+"_7.7z");
  fs.unlinkSync(backup_loc+server_name+"_7.7z")
}
for(ix=6;ix>=0;ix--){
  if((fs.existsSync(backup_loc+server_name+"_"+ix+".7z"))){
  console.log(friendlyTimestamp()+" [INTERNAL] backup: Renaming "+backup_loc+server_name+"_"+ix+".7z to "+backup_loc+server_name+"_"+(ix+1)+".7z.");
  fs.renameSync(backup_loc+server_name+"_"+ix+".7z", backup_loc+server_name+"_"+(ix+1)+".7z");
  }
}
//LAUNCH seven_zip
//7z a ("$mcback\$serverVersion"+"_"+"0"+".7z") "$mcServLocs\$serverVersion\";

console.log(friendlyTimestamp()+" [INFO] backup: Starting backup.");
if(tempData.length >= 200){tempData.shift()}
tempData.push(friendlyTimestamp()+" [INFO] backup: Starting backup.")

seven_zip = spawn(seven_zip_loc,["a", backup_loc+server_name+"_0.7z", "../"+server_name]);
seven_zip.stdout.on("data",function(data){
  var working_data = data.toString().split(/(?=Compressing|Everything)/g);
  for(ix=0;ix<working_data.length;ix++){
    if(tempData.length >= 200){tempData.shift()}
    if(working_data[ix].match(/(Everything)/g)){
      working_data[ix] = working_data[ix].replace(/(\r|\n)/g,"")
      console.log(friendlyTimestamp()+" [INFO] 7z: "+working_data[ix].toString());
      tempData.push(friendlyTimestamp()+" [INFO] 7z: "+working_data[ix].toString());
    }
    else{
      working_data[ix] = working_data[ix].replace(/(\r?\n)/g,"")
      console.log(friendlyTimestamp()+" [INTERNAL] 7z: "+working_data[ix].toString());
    }
  }
});
seven_zip.stderr.on("data",function(data){
    console.log(friendlyTimestamp()+" [ERROR] 7z: " + data);

});
seven_zip.on("exit",function(){
  console.log(friendlyTimestamp()+" [INFO] 7z: Application has exited.")
  update_variables();
  if(do_reboot == true){start_minecraft_server();}
  backup_safe_lock = false;
});
  seven_zip.stdin.end; //end input
}



function web_updater_service(){
web_updater = spawn("powershell.exe", ["-noprofile","./do_thing.ps1"], {cwd: './world/datapacks/'});
web_updater.stdout.on("data",function(stdout){
  var working_data = stdout.toString().replace(/(\r?\n)/g,"");
  if(working_data == ""){}
  else{
  if(tempData.length >= 200){tempData.shift()}
  tempData.push(friendlyTimestamp()+" [INFO] web_updater: "+working_data);
  console.log(friendlyTimestamp()+" [INFO] web_updater: "+working_data);
  }
});
web_updater.stderr.on("data",function(stderr){
  //var working_data = stderr.toString().replace(/(\r?\n)/g,"");
  var working_data = stderr.toString();
  if(working_data == ""){}
  else{
  if(tempData.length >= 200){tempData.shift()}
  tempData.push("<text class=error>"+friendlyTimestamp()+" [ERROR] web_updater:\n"+working_data.replace(/\n/g,"<br/>")+"</text>");
  console.log(friendlyTimestamp()+" [ERROR] web_updater:\n"+working_data);
  }
});
web_updater.on("exit",function(){
});
web_updater.stdin.end; //end input
}

rl.on('line', (input) => {
  if(input == ".help"){
    console.log(".help - This list.")
    console.log(".updateMCVersion [version], sets minecraft_version to specified value.")
    console.log(".exit - Exit Server Manager, kills server if running.")
    console.log("t.[B|R|S|AR] - Toggle Backup|Reboot|Shutdown|AllowRequest.")
    console.log(".switch_version - Server selection.")
    console.log(".start | .start_minecraft_server - Starts the minecraft server.")
    console.log("j.[*] - Sends commands to the java instance.")
    console.log("j.save | j.save-all - Tells minecraft to save.")
    console.log("j.update - Run the reload command in minecraft.")
    console.log("j.running - Check if server is running.")
    console.log("node.[*] - Node specific commands.")
    console.log("node.dump_vars - Dumps all working variables.")
    console.log("node.tempData - Print last item from array.")
    console.log("node.purge - Clear tempData.")
    console.log("node.verbose - Toggle verbosity.")
    console.log("node.testing - Check if in testing environment.")
    console.log("node.friendlyTimeStamp - Print  fTS function.")
    console.log("w.[off|on] - Toggles whitelist.")
  }
  else if(input.match(/\.updateMCVersion/)){
    minecraft_version.update(input.match(/updateMCVersion\s(.+)/)[1])
  }
  else if(input == ".print_minecraft_version" || input == ".print_mcver"){
    console.log(minecraft_version.stored)
  }
  else if(input == ".exit"){
    if(server_running == true){
      minecraft_server.kill();
      console.log("Killed "+minecraft_server);
      server_running = false;
    }
    process.exit();
  }
  else if(input.match(/\.kill/)){
    if(server_running == true){
      minecraft_server.kill();
      console.log("Killed "+minecraft_server);
      server_running = false;
    }
  }
  else if(input.match(/t\.\w/g)){
    var temp_input = input.split(/t\./g);
    update_variables()
    if(temp_input[1] == "B"){
      switch(do_backup){
        case true:
        fs.writeFileSync("backup",letN);
        break;
        case false:
        fs.writeFileSync("backup",letY);
        break;
      }
      do_backup = !do_backup;
      console.log(friendlyTimestamp()+" [INTERNAL] do_backup: "+do_backup.toString())
    }
    else if(temp_input[1] == "R"){
      switch(do_reboot){
        case true:
          fs.writeFileSync("reboot",letN);
        break;
        case false:
          fs.writeFileSync("reboot",letY);
        break;
      }
      do_reboot = !do_reboot;
      console.log(friendlyTimestamp()+" [INTERNAL] do_reboot: "+do_reboot.toString())
    }
    else if(temp_input[1] == "S"){
      switch(do_shutdown){
        case true:
          fs.writeFileSync("shutdown",letN);
        break;
        case false:
          fs.writeFileSync("shutdown",letY);
        break;
      }
      do_shutdown = !do_shutdown;
      console.log(friendlyTimestamp()+" [INTERNAL] do_shutdown: "+do_shutdown.toString())
    }
    else if(temp_input[1] == "AR"){
      switch(allow_player_requests){
        case true:
          fs.writeFileSync("allowRequests",letN);
          break;
        case false:
          fs.writeFileSync("allowRequests",letY);
          break;
        default:
          console.log(friendlyTimestamp()+" [INTERNAL] [ERROR] allow_player_requests broken.")
          break;
      }
      allow_player_requests = !allow_player_requests;
      console.log(friendlyTimestamp()+" [INTERNAL] allow_player_requests: "+allow_player_requests.toString())
    }
    else {}
    temp_input = ''
  }
  else if(input.match(/\.switch_version.*/g)){
    if(input.toString().split(' ')[1]){
      var temp_input = input.toString().split(' ');
      if(temp_input[1].match(/\d/g)){
        readVersion(temp_input[1]);
      }
      else{

        console.log(friendlyTimestamp()+" [ERROR] node: argument needs to be a digit.")
      }
    }
    else{
    readVersion();
    }
  }
  else if(input == ".start_minecraft_server" || input == ".start"){
    if(!server_running){
      console.log(friendlyTimestamp()+" [INTERNAL] Starting server.")
      start_minecraft_server();
    }else{
      console.log(friendlyTimestamp()+" [INTERNAL] Server is already running.");
    }
  }
  else if(input == "j.save" || input == "j.save-all"){
    if(server_running){
      console.log(friendlyTimestamp()+" [INTERNAL] Requesting save.")
      minecraft_server.stdin.write("save-all\n");
    }
  }
  else if(input == "j.running"){
    console.log(server_running);
  }
  else if(input == ".iteration"){
    console.log("NYI")
    /* what was this even supposed to do? */
  }
  else if(input == 'j.update'){
    if(server_running){
      minecraft_server.stdin.write('reload\n');
      //web_updater_service();
    }
  }
  else if(input == 'w.off'){//whitelist off
    if(server_running){
      minecraft_server.stdin.write('whitelist off\n');
      whitelist = false;
    }
  }
  else if(input == 'w.on'){//whitelist on
    if(server_running){
      minecraft_server.stdin.write('whitelist on\n');
      whitelist = true;
    }
  }
  else if(input.match(/node\./g)){
    parseNodeCommands(input.split(/node\./g)[1]);
  }
  else if(input.match(/j\./g)) {
    if(server_running){
      input = input.replace(/j\./g,"");
      minecraft_server.stdin.write(input+'\n');
      console.log('Tried to send: "'+input.toString()+'"');
    }else{
      console.log(friendlyTimestamp()+"[INTERNAL] Server is not running.");
    }
  }
  else{};
});

function playerQuery(){
  if(server_running){
    console.log(friendlyTimestamp()+" [INTERNAL] Querying server for players.")
    minecraft_server.stdin.write("list\n");
  }else if(!server_running){
    console.log(friendlyTimestamp()+" [INTERNAL] Server not running, skipping query.")
  }else{
    console.log(friendlyTimestamp()+" [ERROR] [INTERNAL]: This should never be visible.")
  }
}

//Start actual program
console.log(friendlyTimestamp()+" [INTERNAL] Running server_manager.js in: "+server_name);
update_variables();
readVersion();
/* setInterval(playerQuery,60000); */
/* start_minecraft_server(); */
/* web_updater_service(); */
/* start_backup(); */

//TESTING PART




//process.exit()
//END TEST

http.createServer(function (request, response){
  if(request.url == "/start"){
    console.log("["+request.connection.remoteAddress+"] requested ["+request.url+"] by the ["+request.method+"] method.")
    if(!server_running && !backup_safe_lock && allow_player_requests){
      start_request_time = (new Date).getTime()
      if(start_request_time > last_exit+((5*60)*1000)){
        start_minecraft_server();
      }else{
        tempData.push(friendlyTimestamp()+" [WEBTOOL] Server recently shut down, please try again later.");
      }
    }else if(!server_running && backup_safe_lock){
      tempData.push(friendlyTimestamp() + " [WEBTOOL] Server is currently backing up, please try again later.");
    }else if(server_running){
      tempData.push(friendlyTimestamp() + " [WEBTOOL] Server is already running.");
    }else if(!allow_player_requests){
      tempData.push(friendlyTimestamp() + " [WEBTOOL] Server is currently not accepting start requests, please try again later.")
    }
    response.writeHead(200,{'Content-Type':'text/html'})
    response.write('<script>location.replace("http://'+host_address+":"+web_server_port+'/requested_start");</script>');
    response.end();
  }else if(request.url == '/refresh'){
    response.writeHead(200,{'Content-Type':'text/html'})
    response.write('<script>location.replace("http://'+host_address+":"+web_server_port+'/auto_refresh");</script>');
    response.end();
  }
  else{
    if(!web_color_static){
      randomize_web_color();
    }
    response.writeHead(200, {'Content-Type': 'text/html'});
    response.write(gen_style_data(true));
    response.write(interface_div_start+gen_interface_div_content(true)+interface_div_end);
    response.write('<div id="log_info"><h1>Last '+tempData.length+' lines of log-data:</h1></div>'+log_div);
    if(tempData.length>0){
      for(i=0;i<tempData.length;i++){response.write('<div class="log_line">'+tempData[i]+'</div>');}
    }else{
      response.write('<div class="log_line">No entries so far.</div>');
    }
    response.write(log_div_end);
    if(request.url == "/requested_start"){
      response.write('<script>setTimeout(function(){location.replace("http://'+host_address+":"+web_server_port+'/")},5000);</script>');
    }
    if(request.url == "/auto_refresh"){
      response.write('<script>console.log("Refreshing every minute.");setTimeout(function(){location.reload()},60000);</script>');
    }
    response.write(end_html);
    response.end();
  }
}).listen((web_server_port));
