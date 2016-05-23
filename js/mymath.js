console.log('load mymath');

Vector2 = function(x,y){
    
    //メンバー関数,変数
   this.x = x;
   this.y = y;
   
   //足し算　引き算　掛け算　割り算
   this.add = function(v){return new Vector2(this.x + v.x, this.y + v.y);};
   this.sub = function(v){return new Vector2(this.x - v.x, this.y - v.y);};
   this.mul = function(a){return new Vector2(this.x * a, this.y * a);};
   this.div = function(a){return new Vector2(this.x/a, this.y/a);};
   this.distance = function(){
       return Math.sqrt(this.x * this.x + this.y * this.y);
   }
   this.toString = function(){
       return "(" + this.x + "," + this.y + ")";
   }

}