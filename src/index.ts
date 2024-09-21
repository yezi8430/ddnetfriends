import { TIMEOUT } from 'dns';
import { Session } from 'inspector/promises';
import { Context, Schema ,Database,$,h } from 'koishi';
import { } from 'koishi-plugin-puppeteer'
import { config } from 'process';
import type { Page } from 'puppeteer-core'
import { arrayBuffer } from 'stream/consumers';
export const inject = {required:["database"],optional: ['puppeteer']}
export const name = 'ddnetfriends';
export const Config: Schema<Config> = Schema.object({
  useimage: Schema.boolean().description('是否使用图片样式').default(true),
  enablewarband: Schema.boolean().description('是否显示战队(返回的数据以官网为准,如果好友不是该战队,可能是别人恰分改的ID？)').default(true)
});


export interface Config {
  useimage: boolean
  enablewarband:boolean
};

declare module 'koishi' {
  interface Tables {
    ddnetfriendsdata: ddnetfriendsdata
  }
}

export interface ddnetfriendsdata {
  id: number
  userid:string
  friendname: string
  playername:string

}
//const import_koishi = require("koishi");


//好友列表
async function ddlist(ctx) {
  const urls = [
    'https://master1.ddnet.org/ddnet/15/servers.json',
    'https://master2.ddnet.org/ddnet/15/servers.json',
    'https://master3.ddnet.org/ddnet/15/servers.json',
    'https://master4.ddnet.org/ddnet/15/servers.json',
    'https://master5.ddnet.org/ddnet/15/servers.json'
  ];

  try {
    const fetchPromises = urls.map(url => 
      fetch(url)
        .then(response => response.json())
        .catch(() => null) // 静默处理错误，返回null
    );

    const responses = await Promise.all(fetchPromises);
    const validResponses = responses.filter(response => response !== null);

    if (validResponses.length === 0) {
      ctx.logger('所有请求都失败了,可能是服务器炸了？');
      
    }

    const htmldata = validResponses[0];


    return htmldata;
    

  } catch (error) {
    ctx.logger('获取数据时发生错误:', error);
    throw error;
  }
  
}

async function addplayer(ctx:Context,{session}){
  session.send( "请输入要添加的玩家id");
  const input = await session.prompt(20000);
  if (input && input.length !== 0)
    await ctx.database.create("ddnetfriendsdata", { userid:session.userId,playername: input});
  session.send('添加成功,玩家id:'+input)
  return;
}


async function deleteplayer(ctx: Context, { session }) {
  const existingPlayers = await ctx.database.get("ddnetfriendsdata", { 
    userid: session.userId
  });

  const validPlayers = existingPlayers.filter(player => player.playername !== '');
  
  if (validPlayers.length > 0) {
    const playerList = validPlayers.map((player, index) => `${index + 1}.${player.playername}`).join('\n');
    session.send(`当前玩家列表：\n${playerList}\n\n请输入要删除的玩家序号：`);
    
    const input = await session.prompt(20000);
    const index = parseInt(input) - 1;
    
    if (isNaN(index) || index < 0 || index >= validPlayers.length) {
      session.send("无效的输入，删除取消");
      return;
    }
    
    const playerToDelete = validPlayers[index];
    await ctx.database.remove("ddnetfriendsdata", { 
      userid: session.userId, 
      playername: playerToDelete.playername 
    });
    session.send('删除成功，玩家: ' + playerToDelete.playername);
    return;
  } else {
    return;
    //session.send('没有找到任何玩家，删除取消');
  }
}



async function getpoints(ctx: Context,{ session },target) {
  const pointsurl='https://ddnet.org/players/?json2=';
  let playernamelist;
 try{
  if (target !==null){
    playernamelist =[{playername:target}];
  }
  else{
    playernamelist = await ctx.database.get('ddnetfriendsdata', {
      userid: session.userId,
      playername: { $ne: '' }  // 添加这个条件来确保 playername 不为空
    }, ['playername']);
    
  }
  


  // 添加返回内容为空的提示
  if (playernamelist.length === 0) {
    
    session.send( "未找到匹配的玩家id,是否要添加");
    const input = await session.prompt(20000);
      if (input && input.length !==0)
      {
        await ctx.database.create("ddnetfriendsdata", {userid:session.userId, playername: input});
        session.send('添加成功,玩家id:'+input)
        return;
      }
      else{
        return;
      }
    
  }
  else if(playernamelist.length > 1){//返回玩家数量大于1的情况

    const newPlayerArray = playernamelist.map(player => player.playername);
    const formattedPlayerNames = newPlayerArray.map((name, index) => 
      `${index + 1}.${name}`
  ).join('\n');
    session.send('请输入要查询玩家的序号:\n'+formattedPlayerNames)
    const input = await session.prompt(20000);
    if (input && input.length !== 0){

      const inputNumber = parseInt(input);
      if (isNaN(inputNumber) || inputNumber < 1 || inputNumber > playernamelist.length) {
        session.send("无效输入。请输入一个有效的序号。");
        return;
      }
      const fetchPromises = await fetch(pointsurl+playernamelist[input-1].playername)
      .then(response => response.json())
      .catch(() => null); // 静默处理错误，返回null
      if (fetchPromises && fetchPromises.player && fetchPromises.points) {
        const playerName = fetchPromises.player;
        const playerPoints = fetchPromises.points.points;
        const playerRank = fetchPromises.points.rank;
        session.send(playerName+':'+playerPoints+'排名:'+playerRank)
        return;
      }else {
        session.send("没有查到这个玩家,看一下是不是输错id了吧");
      }
    }
    else{
      return;
    }


  }
  else{//返回玩家数量1情况


    try{
      
      const fetchPromises = await fetch(pointsurl+playernamelist[0].playername)
        .then(response => response.json())
        .catch(() => null); // 静默处理错误，返回null
        if (fetchPromises && fetchPromises.player && fetchPromises.points) {
          const playerName = fetchPromises.player;
          const playerPoints = fetchPromises.points.points;
          const playerRank = fetchPromises.points.rank;
          session.send(playerName+':'+playerPoints+'排名:'+playerRank)
          return;
        }else {
          session.send("没有查到这个玩家,看一下是不是输错id了吧");
        }
    }
    catch{
      ctx.logger('获取数据时发生错误');
    }
  }
 }catch(error){
  session.send('网络似乎开了会儿小差'+error)
  return;
 }
}


async function extractNames(input) {
  // 使用正则表达式匹配所有的名字
  const regex = /add_friend\s+"([^"]+)"/g;
  const matches = input.match(regex);
  
  // 从匹配结果中提取名字并存入数组
  const names = matches.map(match => {
    return match.replace(/add_friend\s+"/, '').replace(/"$/, '');
  });
  
  // 将数组转换为逗号分隔的字符串
  return names.join(',');
  
}

//添加好友
async function addlist(ctx: Context, arrfriends) {
  for (let friend of arrfriends) {
    // 首先检查数据库中是否已存在相同的 userid 和 friendname
    const existingRecord = await ctx.database.get('ddnetfriendsdata', {
      userid: friend.userid,
      friendname: friend.friendname
    });

    // 如果不存在相同记录，则创建新记录
    if (!existingRecord || existingRecord.length === 0) {
      await ctx.database.create('ddnetfriendsdata', {
        userid: friend.userid,
        friendname: friend.friendname
      });
    }
    // 如果存在相同记录，则跳过（不做任何操作）
  }
}


var backlist
//获取列表
async function getlist(ctx: Context, qqid) {  

  const backlist =await ctx.database.get('ddnetfriendsdata', {userid: [qqid],},['friendname'])

  //console.log(backlist);
  return backlist;
}




//删除好友
async function deletefriend(ctx: Context, userid,friendname) {
  for (let friend of friendname) {
  const backlist = await ctx.database.remove("ddnetfriendsdata", { userid: friend.userid, friendname: friend.friendname});
  return backlist.matched;
  }
}

async function getimage(nickname1,warband){
  

  let canvas = [];
  Object.keys(nickname1).forEach(index => {
    canvas.push(`'canvas${parseInt(index)}'`); // 将字符串转换为整数并加 1
  });
  const canvasnew = canvas.join(', ');
  
  let div='';
  const imageurl = nickname1.map(item => `'https://ddnet.org/skins/skin/community/${item.skin}.png'`);
  //console.log(imageurl)
  for (let key in nickname1) {
    if (nickname1.hasOwnProperty(key)) {
      if (warband === true) {
        
        if (nickname1[key].warband && nickname1[key].warband !== 'null') {
          nickname1[key].warband = ' - [' + nickname1[key].warband+']';
          
        }
      }
      else
      {
        nickname1[key].warband =''
      }
      if (nickname1[key].afk =='true'){
        nickname1[key].afk='afk';
      }
      else{
        nickname1[key].afk='';
      }

      
        div += `<div class="user-list">
                        <div class="user-item ${nickname1[key].afk}">
                            <canvas class="my-canvas" style="width: 96px; height: 64px" id=canvas`+[key]+`></canvas>
                            <div class="user-info">
                                <p class="user-name">${nickname1[key].friendname}${nickname1[key].warband}</p>
                                <p class="user-details">服务器:${nickname1[key].servername}</p>
                                <p class="user-details">地图名:${nickname1[key].mapname}</p>
                            </div>
                        </div>
                  </div>`;
    }

}

const colorBodyArray = nickname1.map(item => item.color_body);
//console.log(colorBodyArray)
  const htmlContent =`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
    <style>
        @font-face {
        font-family: 'Font';
        src: url('font/NotoColorEmoji-Regular.ttf') format('truetype');
        font-weight: normal;
        font-style: normal;
      }


        body {
            font-family: 'Font', NotoColorEmoji-Regular;
            background-color: #2c2c2c;
            padding: 0px;
            width:300px;
            resize: both;
        }
        .user-list {
            width: 300px;
            margin: 0 ;
        }
        .user-item {
            display: flex;
            align-items: center;
            background-color: #4c8c4f;
            margin-bottom: 5px;
            padding: 10px;
            border-radius: 5px;
        }
        .user-avatar {
            width: 30px;
            height: 30px;
            border-radius: 50%;
            margin-right: 10px;
        }
        .user-info {
            flex-grow: 1;
        }
        .user-name {
            color: #ffffff;
            font-weight: bold;
            margin: 0;
        }
        .user-details {
            color: #d4d4d4;
            font-size: 0.8em;
            margin: 0;
        }
        .afk{
        background-color: #998500;
        }
    </style>
</head>
<body>`+div+`

<script>


window.onload = function() {
    const canvasIds = [`+canvasnew+`];
    const canvases = canvasIds.map(id => document.getElementById(id));
    const contexts = canvases.map(canvas => canvas.getContext('2d'));

    // 图像源
    const images = [
        `+imageurl+`
    ];
    
    // 创建一个加载图像的 Promise 数组
    const imagePromises = images.map((src, index) => loadImage(src, index));

    // 使用 Promise.all 等待所有图像加载完成
    Promise.all(imagePromises)
        .then(() => {
            console.log('All images loaded successfully');
        })
        .catch(error => {
            console.error('Error loading images:', error);
        });

    function loadImage(src, index) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onerror = function() {
                // 如果主要链接加载失败，尝试使用备用链接
                if (img.src !== 'https://ddnet.org/skins/skin/default.png') {
                    console.log('Image load failed. Trying backup URL.');
                    img.src = 'https://ddnet.org/skins/skin/default.png';
                } else {
                    reject('Both primary and backup image URLs failed to load.');
                }
            };
            img.onload = function() {
                const s = 1;

                // 为每个画布绘制相应的图像
                const canvas = canvases[index];
                const context = contexts[index];
                canvas.width = 96 * s;
                canvas.height = 64 * s;
                drawImages(context, img, s);
                resolve();
            };
            img.src = src;
        });
    }

    // 绘制图像的函数
function drawImages(ctx, img, s) {



    // 开始渲染
    ctx.drawImage(img, 192 * s, 64 * s, 64 * s, 32 * s, 8 * s, 32 * s, 64 * s, 30 * s); // back feet shadow
    ctx.drawImage(img, 96 * s, 0 * s, 96 * s, 96 * s, 16 * s, 0 * s, 64 * s, 64 * s); // body shadow
    ctx.drawImage(img, 192 * s, 64 * s, 64 * s, 32 * s, 24 * s, 32 * s, 64 * s, 30 * s); // front feet shadow
    ctx.drawImage(img, 192 * s, 32 * s, 64 * s, 32 * s, 8 * s, 32 * s, 64 * s, 30 * s); // back feet
    ctx.drawImage(img, 0 * s, 0 * s, 96 * s, 96 * s, 16 * s, 0 * s, 64 * s, 64 * s); // body
    ctx.drawImage(img, 192 * s, 32 * s, 64 * s, 32 * s, 24 * s, 32 * s, 64 * s, 30 * s); // front feet
    ctx.drawImage(img, 64 * s, 96 * s, 32 * s, 32 * s, 39 * s, 18 * s, 26 * s, 26 * s); // left eye

    // right eye (flip and draw)
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(img, 64 * s, 96 * s, 32 * s, 32 * s, -73 * s, 18 * s, 26 * s, 26 * s);
    ctx.restore();
    



}

    // 获取所有 .user-item 元素
    const userLists = document.querySelectorAll('.user-item');
    // 计算 body 的高度
    const bodyHeight = userLists.length * 89; // 每个 .user-item 高度为 89px

    
};



</script>
</body>
</html>`




return htmlContent;
}



function updateserverinfo(htmldata)
{
  if (typeof htmldata === 'object' && htmldata !== null) {
    const dataArray = Object.values(htmldata)[0];
  
    if (Array.isArray(dataArray)) {
      let flattenedData = [];
  
      try {
        flattenedData = dataArray.flatMap(item => {
          const servername = item.info.name;
          const mapname = item.info.map.name;
  
          if (item.info.clients.length === 0) {
            return [`friendname:null,skinname:null,servername:${servername},mapname:${mapname}`];
          }
  
          return item.info.clients.map(client => 
            `friendname:${client.name || 'null'},skinname:${client.skin?.name || 'null'},servername:${servername},mapname:${mapname},color_body:${client.skin?.color_body || 'null'},color_feet:${client.skin?.color_feet || 'null'},warband:${client.clan},afk:${client.afk}`
          );
        });
        //console.log(flattenedData)
        return flattenedData;
      } catch (error) {
        console.error('Error processing data:', error);
        console.log('Raw dataArray:', JSON.stringify(dataArray, null, 2));
      }
    } 
  } 
}

function checkAndPrintFriendsnew(newclientInfoArray, backlist) {
  const backlistSet = new Set(backlist.map(item => item.friendname));

  // 过滤 newclientInfoArray，只保留在 backlist 中存在的非空 friendname
  const formattedIntersection = newclientInfoArray
    .map(item => {
      const parts = item.split(',');
      const friendname = parts[0].split(':')[1];
      if (!friendname || !backlistSet.has(friendname)) {
        return null;
      }
      return {
        friendname,
        skin: parts[1].split(':')[1],
        servername: parts[2].split(':')[1],
        mapname: parts[3].split(':')[1],
        color_body: parts[4].split(':')[1],
        color_feet: parts[5].split(':')[1],
        warband:parts[6].split(':')[1],
        afk:parts[7].split(':')[1]
      };
    })
    .filter(Boolean); // 过滤掉 null 值

  // 输出结果
  //console.log(formattedIntersection);
  return formattedIntersection;
}









export async function apply(ctx: Context,Config) {

  ctx.model.extend('ddnetfriendsdata', {
    // 各字段的类型声明
    id: 'unsigned',
    userid:'string',
    friendname: 'string',
    playername:'string'
},
{
  primary: 'id',
  autoInc: true,
}
)
  
  


  // write your plugin here



  
  ctx.command('dd在线')
  .action(async ({ session }) => {
    if (Config?.useimage === true) {
      const htmldata = await ddlist(ctx); //获取全部列表
      const qqid = session.userId;
      let backlist = await getlist(ctx, qqid);

      if (backlist.length === 0) {
        session.send('未找到相关数据,你似乎还没有导入好友列表');
        return;
      } else {
        let newclientInfoArray = updateserverinfo(htmldata);
        let allfriends = checkAndPrintFriendsnew(newclientInfoArray, backlist);
        //console.log(allfriends)
        //console.log(newclientInfoArray)
        if (allfriends.length === 0) {
          session.send('无在线好友');
          return;
        } else {
          let page;
          let context;
          let browser;
          let warband;
          try {
            // 使用图片处理好友列表
            const nickname1 = allfriends; // 在线好友名字
            if (Config?.enablewarband === true) {
            warband=true;
            }else{
              warband=false;
            }
            const gethtml = await getimage(nickname1,warband)// 从函数中获取html}
            //console.log(nickname1)
            browser = ctx.puppeteer.browser;
            context = await browser.createBrowserContext();
            page = await context.newPage();

            await page.setContent(gethtml);
            try {
              await page.waitForNetworkIdle({ idleTime: 500, timeout: 5000 }); // 调整等待时间
            } catch (error) {
              session.send('网络似乎开小差了', error);
              if (error.message && error.message.includes('Timeout')) {
                console.error('Timeout error detected.');
              }
              throw error; // 抛出错误
            }

            const bodyHeight = await page.evaluate(() => {
              return document.body.scrollHeight;
            });

            const clip = {
              x: 0,        // 起始点 x 坐标
              y: 0,        // 起始点 y 坐标
              width: 315,  // 截图宽度
              height: bodyHeight + 15  // 截图高度
            };

            const image = await page.screenshot({ clip });
            await session.send(h.image(image, 'image/png'));
          } catch (error) {
            ctx.logger.error('Error during Puppeteer operations:', error);
          } finally {
            // 确保资源释放
            if (page) {
              try {
                await page.close();
              } catch (e) {
                ctx.logger.error('Failed to close page:', e);
              }
            }
            if (context) {
              try {
                await context.close();
              } catch (e) {
                ctx.logger.error('Failed to close context:', e);
              }
            }
          }
        }
      }
    } else {
      // 不使用图片输出方式
      const htmldata = await ddlist(ctx);
      let newclientInfoArray = updateserverinfo(htmldata);
      const qqid = session.userId;
      let backlist = await getlist(ctx, qqid);

      if (backlist.length === 0) {
        session.send('未找到相关数据,你似乎还没有导入好友列表');
        return;
      } else {
        let allfriends = checkAndPrintFriendsnew(newclientInfoArray, backlist);
        if (allfriends.length === 0) {
          session.send('无在线好友');
          return;
        } else {
          let resultString = allfriends.map(friend => `${friend.friendname}\n`).join('');
          session.send(h('at', { id: session.userId }) + '你的在线好友:\n' + resultString);
          return;
        }
      }
    }
  });



//--------------------------------------------------------------------------------------------------------------------------------------------------------------

ctx.command('dd删除好友')
 
.action(async ({session}) => {
  const userid = session.userId;  // 定义用户 ID
  
  session.send('输入好友列表，如 123,234,abc,支持单个或批量');
  
  if (session.content !== '') {
      
    const dispose = ctx.on('message', async (session)=> {
    
      const str = session.content;  // 定义需要转换的字符串

      // 使用 split 方法将字符串分割成数组
      const friendNames = str.split(',');

      // 使用 map 方法生成对象数组
      const arrfriends = friendNames.map(friendName => {
      return { 'userid': userid, 'friendname': friendName };

    });
    //console.log(arrfriends);
     const  deletesum =await deletefriend(ctx,userid,arrfriends);
    if (deletesum !== 0) {  
      session.send("已删除"+deletesum+"个好友");  
      dispose()
    } else {  
      session.send("删除"+deletesum+"个好友，似乎没有找到匹配项");  
      dispose()
    }

      //session.send(session.content+session.userId);
    })

   
     
    

  } else {
    // 如果去掉这一行，那么不满足上述条件的消息就不会进入下一个中间件了
    
  }
});


//--------------------------------------------------------------------------------------------------------------------------------------------------------------

//--------------------------------------------------------------------------------------------------------------------------------------------------------------



  ctx.command('dd添加好友')
  .action(async ({ session }) => {
    session.send('请输入好友列表，如:\nadd_friend "测试" "战队1"\nadd_friend "测试2" ""\nadd_friend "测试3" "zd3"\n一般来说你直接在游戏中打开皮肤目录，再返回上一级\n有一个名为settings_ddnet.cfg的文件\n直接复制以add_friend开头直到最后的内容就行了\n输入:取消\n可以取消输入');

    const content = await session.prompt();

    if (content === '取消') {
      await session.send("已取消输入");
      return;
    }

    const userid = session.userId;
    const str =await extractNames(content);
    const friendNames = str.split(',');

    const arrfriends = friendNames.map(friendName => ({
      userid: userid,
      friendname: friendName
    }));

    await addlist(ctx, arrfriends);
    return void session.send("添加成功");
  });


//--------------------------------------------------------------------------------------------------------------------------------------------------------------




//查分\添加玩家id
ctx.command('添加玩家')
.action(async ({ session }) => {
await addplayer(ctx,{session})
return;
});


ctx.command('points [...args:string]')
  .alias('查分')
  .action(async ({ session, args }) => {
    if (args.length > 0) {
      // 如果有追加内容，进行相应处理
      const target = args.join(' ');
      await getpoints(ctx, { session },target);
    } else {
      // 如果没有追加内容，执行原来的逻辑
      const target=null
      await getpoints(ctx, { session },target);
    }
  });

ctx.command('删除玩家')
.action(async ({ session }) => {
await deleteplayer(ctx,{session})
return;
});


}