function crosPermission(){
    this.permission=function(req,res,next){
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');      
      res.header('Access-Control-Allow-Headers', 'Content-Type, x-access-token');
      // res.header('Access-Control-Allow-Headers', 'Authorization');
      //res.header('Access-Control-Expose-Headers');
      next();
    }
  }
  
  module.exports= new crosPermission();
