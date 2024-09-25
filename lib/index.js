var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  Config: () => Config,
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(src_exports);
var import_koishi = require("koishi");
var import_fs = __toESM(require("fs"));
var fontPath = require.resolve("../font/seguiemj.ttf");
var fontBase64 = import_fs.default.readFileSync(fontPath, { encoding: "base64" });
var inject = { required: ["database"], optional: ["puppeteer"] };
var name = "ddnetfriends";
var Config = import_koishi.Schema.object({
  useimage: import_koishi.Schema.boolean().description("是否使用图片样式").default(true),
  enablewarband: import_koishi.Schema.boolean().description("是否显示战队(返回的数据以官网为准,如果好友不是该战队,可能是别人恰分改的ID？)").default(true),
  enableemoji: import_koishi.Schema.boolean().description("是否开启emoji,改善有些id或战队使用emoji表情的显示情况,但是有可能会影响加载速度(maybe)").default(false),
  colorbodyconfig: import_koishi.Schema.boolean().description("启用皮肤颜色,不过相比游戏内会显得更亮一点,自己看着要不要开关吧").default(false)
});
async function ddlist(ctx) {
  const urls = [
    "https://master1.ddnet.org/ddnet/15/servers.json",
    "https://master2.ddnet.org/ddnet/15/servers.json",
    "https://master3.ddnet.org/ddnet/15/servers.json",
    "https://master4.ddnet.org/ddnet/15/servers.json",
    "https://master5.ddnet.org/ddnet/15/servers.json"
  ];
  try {
    const fetchPromises = urls.map(
      (url) => fetch(url).then((response) => response.json()).catch(() => null)
      // 静默处理错误，返回null
    );
    const responses = await Promise.all(fetchPromises);
    const validResponses = responses.filter((response) => response !== null);
    if (validResponses.length === 0) {
      ctx.logger("所有请求都失败了,可能是服务器炸了？");
    }
    const htmldata = validResponses[0];
    return htmldata;
  } catch (error) {
    ctx.logger("获取数据时发生错误:", error);
    throw error;
  }
}
__name(ddlist, "ddlist");
async function addplayer(ctx, { session }) {
  session.send("请输入要添加的玩家id");
  const input = await session.prompt(2e4);
  if (input && input.length !== 0)
    await ctx.database.create("ddnetfriendsdata", { userid: session.userId, playername: input });
  session.send("添加成功,玩家id:" + input);
  return;
}
__name(addplayer, "addplayer");
async function deleteplayer(ctx, { session }) {
  const existingPlayers = await ctx.database.get("ddnetfriendsdata", {
    userid: session.userId
  });
  const validPlayers = existingPlayers.filter((player) => player.playername !== "");
  if (validPlayers.length > 0) {
    const playerList = validPlayers.map((player, index2) => `${index2 + 1}.${player.playername}`).join("\n");
    session.send(`当前玩家列表：
${playerList}

请输入要删除的玩家序号：`);
    const input = await session.prompt(2e4);
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
    session.send("删除成功，玩家: " + playerToDelete.playername);
    return;
  } else {
    return;
  }
}
__name(deleteplayer, "deleteplayer");
async function getpoints(ctx, { session }, target) {
  const pointsurl = "https://ddnet.org/players/?json2=";
  let playernamelist;
  try {
    if (target !== null) {
      playernamelist = [{ playername: target }];
    } else {
      playernamelist = await ctx.database.get("ddnetfriendsdata", {
        userid: session.userId,
        playername: { $ne: "" }
        // 添加这个条件来确保 playername 不为空
      }, ["playername"]);
    }
    if (playernamelist.length === 0) {
      session.send("未找到匹配的玩家id,是否要添加");
      const input = await session.prompt(2e4);
      if (input && input.length !== 0) {
        await ctx.database.create("ddnetfriendsdata", { userid: session.userId, playername: input });
        session.send("添加成功,玩家id:" + input);
        return;
      } else {
        return;
      }
    } else if (playernamelist.length > 1) {
      const newPlayerArray = playernamelist.map((player) => player.playername);
      const formattedPlayerNames = newPlayerArray.map(
        (name2, index) => `${index + 1}.${name2}`
      ).join("\n");
      session.send("请输入要查询玩家的序号:\n" + formattedPlayerNames);
      const input = await session.prompt(2e4);
      if (input && input.length !== 0) {
        const inputNumber = parseInt(input);
        if (isNaN(inputNumber) || inputNumber < 1 || inputNumber > playernamelist.length) {
          session.send("无效输入。请输入一个有效的序号。");
          return;
        }
        const fetchPromises = await fetch(pointsurl + playernamelist[input - 1].playername).then((response) => response.json()).catch(() => null);
        if (fetchPromises && fetchPromises.player && fetchPromises.points) {
          const playerName = fetchPromises.player;
          const playerPoints = fetchPromises.points.points;
          const playerRank = fetchPromises.points.rank;
          session.send(playerName + ":" + playerPoints + "排名:" + playerRank);
          return;
        } else {
          session.send("没有查到这个玩家,看一下是不是输错id了吧");
        }
      } else {
        return;
      }
    } else {
      try {
        const fetchPromises = await fetch(pointsurl + playernamelist[0].playername).then((response) => response.json()).catch(() => null);
        if (fetchPromises && fetchPromises.player && fetchPromises.points) {
          const playerName = fetchPromises.player;
          const playerPoints = fetchPromises.points.points;
          const playerRank = fetchPromises.points.rank;
          session.send(playerName + ":" + playerPoints + "排名:" + playerRank);
          return;
        } else {
          session.send("没有查到这个玩家,看一下是不是输错id了吧");
        }
      } catch {
        ctx.logger("获取数据时发生错误");
      }
    }
  } catch (error) {
    session.send("网络似乎开了会儿小差" + error);
    return;
  }
}
__name(getpoints, "getpoints");
async function extractNames(input) {
  const regex = /add_friend\s+"([^"]+)"/g;
  const matches = input.match(regex);
  const names = matches.map((match) => {
    return match.replace(/add_friend\s+"/, "").replace(/"$/, "");
  });
  return names.join(",");
}
__name(extractNames, "extractNames");
async function addlist(ctx, arrfriends) {
  for (let friend of arrfriends) {
    const existingRecord = await ctx.database.get("ddnetfriendsdata", {
      userid: friend.userid,
      friendname: friend.friendname
    });
    if (!existingRecord || existingRecord.length === 0) {
      await ctx.database.create("ddnetfriendsdata", {
        userid: friend.userid,
        friendname: friend.friendname
      });
    }
  }
}
__name(addlist, "addlist");
async function getlist(ctx, qqid) {
  const backlist = await ctx.database.get("ddnetfriendsdata", { userid: [qqid] }, ["friendname"]);
  return backlist;
}
__name(getlist, "getlist");
async function deletefriend(ctx, userid, friendname) {
  for (let friend of friendname) {
    const backlist = await ctx.database.remove("ddnetfriendsdata", { userid: friend.userid, friendname: friend.friendname });
    return backlist.matched;
  }
}
__name(deletefriend, "deletefriend");
async function getimage(nickname1, warband, emoji, colorbodyconfig) {
  let newcolorbody;
  let colorbody;
  if (colorbodyconfig == true) {
    const processColorBody = /* @__PURE__ */ __name((colorBody) => {
      if (colorBody === "null") {
        return null;
      }
      let hex = parseInt(colorBody).toString(16).padStart(6, "0");
      let h2 = Math.round(parseInt(hex.slice(0, 2), 16) * 1.411);
      let s = Math.round(parseInt(hex.slice(2, 4), 16) * 0.392);
      let l = Math.round(parseInt(hex.slice(4, 6), 16) * 0.392);
      if (l < 107) {
        l = Math.floor(l / 2) + 128;
      }
      l = l * 0.392;
      const hslToRgb = /* @__PURE__ */ __name((h3, s2, l2) => {
        s2 /= 100;
        l2 /= 100;
        const a = s2 * Math.min(l2, 1 - l2);
        const f = /* @__PURE__ */ __name((n) => {
          const k = (n + h3 / 30) % 12;
          return l2 - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        }, "f");
        return [
          Math.round(255 * f(0)),
          Math.round(255 * f(8)),
          Math.round(255 * f(4))
        ];
      }, "hslToRgb");
      const [r, g, b] = hslToRgb(h2, s, l);
      return { r, g, b };
    }, "processColorBody");
    colorbody = nickname1.map((friend) => {
      const color = processColorBody(friend.color_body);
      if (color === null) {
        return "null";
      }
      return `${color.r},${color.g},${color.b}`;
    });
    newcolorbody = JSON.stringify(colorbody);
  } else {
    let groupCount = Object.keys(nickname1).length;
    newcolorbody = Array(groupCount).fill("null");
    newcolorbody = JSON.stringify(newcolorbody);
  }
  console.log(newcolorbody);
  let emojistring;
  if (emoji == true) {
    emojistring = "font-family: 'Font', seguiemj;";
  } else {
    emojistring = "";
  }
  let canvas = [];
  Object.keys(nickname1).forEach((index) => {
    canvas.push(`'canvas${parseInt(index)}'`);
  });
  const canvasnew = canvas.join(", ");
  let div = "";
  const imageurl = nickname1.map((item) => `'https://ddnet.org/skins/skin/community/${item.skin}.png'`);
  for (let key in nickname1) {
    if (nickname1.hasOwnProperty(key)) {
      if (warband === true) {
        if (nickname1[key].warband && nickname1[key].warband !== "null") {
          nickname1[key].warband = " - [" + nickname1[key].warband + "]";
        }
      } else {
        nickname1[key].warband = "";
      }
      if (nickname1[key].afk == "true") {
        nickname1[key].afk = "afk";
      } else {
        nickname1[key].afk = "";
      }
      div += `<div class="user-list">
                        <div class="user-item ${nickname1[key].afk}">
                            <canvas class="my-canvas" style="width: 96px; height: 64px" id=canvas` + [key] + `></canvas>
                            <div class="user-info">
                                <p class="user-name">${nickname1[key].friendname}<span class="warband">${nickname1[key].warband}</span></p>
                                <p class="user-details">服务器:${nickname1[key].servername}</p>
                                <p class="user-details">地图名:${nickname1[key].mapname}</p>
                            </div>
                        </div>
                  </div>`;
    }
  }
  const colorBodyArray = nickname1.map((item) => item.color_body);
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
    <style>
        @font-face {
        font-family: 'Font';
        src: url(data:font/truetype;charset=utf-8;base64,${fontBase64}) format('truetype');
        font-weight: normal;
        font-style: normal;
      }


        body {
            ${emojistring}
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
<body>` + div + `

<script>
window.onload = function() {
    var canvasIds = [` + canvasnew + `];
    var canvases = canvasIds.map(function(id) { return document.getElementById(id); });
    var contexts = canvases.map(function(canvas) { return canvas.getContext('2d'); });

    // 图像源
    var images = [
` + imageurl + `
    ];
    
    var colorbody = ${newcolorbody};

    // 创建一个加载图像的 Promise 数组
    var imagePromises = images.map(function(src, index) { return loadImage(src, index); });

    // 使用 Promise.all 等待所有图像加载完成
    Promise.all(imagePromises)
        .then(function() {
            console.log('All images loaded successfully');
        })
        .catch(function(error) {
            console.error('Error loading images:', error);
        });

function loadImage(src, index) {
    return new Promise(function(resolve, reject) {
        var img = new Image();
        img.crossOrigin = "Anonymous";  // 设置在 src 之前
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
                var s = 1;

                // 为每个画布绘制相应的图像
                var canvas = canvases[index];
                var context = contexts[index];
                canvas.width = 96 * s;
                canvas.height = 64 * s;

                // 处理图像颜色
                var processedImg = processImageColor(img, colorbody[index]);
                
                drawImages(context, processedImg, s);
                resolve();
            };
            img.src = src;
        });
    }

    // 处理图像颜色的函数
function processImageColor(img, color) {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    canvas.width = img.width;
    canvas.height = img.height;

    // 绘制原始图像
    ctx.drawImage(img, 0, 0);

    // 如果颜色不是 'null'，进行处理
    if (color !== 'null') {
        var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        var data = imageData.data;
        var rgb = color.split(',').map(Number);

        for (var i = 0; i < data.length; i += 4) {
            var avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            // 使用原始亮度调整新颜色
            data[i] = Math.min(255, (rgb[0] * avg) / 128);
            data[i + 1] = Math.min(255, (rgb[1] * avg) / 128);
            data[i + 2] = Math.min(255, (rgb[2] * avg) / 128);
            // 保持原始的 alpha 值
        }

        ctx.putImageData(imageData, 0, 0);
    }

    return canvas;
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
    var userLists = document.querySelectorAll('.user-item');
    // 计算 body 的高度
    var bodyHeight = userLists.length * 89; // 每个 .user-item 高度为 89px
};
</script>
</body>
</html>`;
  return htmlContent;
}
__name(getimage, "getimage");
function updateserverinfo(htmldata) {
  if (typeof htmldata === "object" && htmldata !== null) {
    const dataArray = Object.values(htmldata)[0];
    if (Array.isArray(dataArray)) {
      let flattenedData = [];
      try {
        flattenedData = dataArray.flatMap((item) => {
          const servername = item.info.name;
          const mapname = item.info.map.name;
          if (item.info.clients.length === 0) {
            return [`friendname:null,skinname:null,servername:${servername},mapname:${mapname}`];
          }
          return item.info.clients.map(
            (client) => `friendname:${client.name || "null"},skinname:${client.skin?.name || "null"},servername:${servername},mapname:${mapname},color_body:${client.skin?.color_body || "null"},color_feet:${client.skin?.color_feet || "null"},warband:${client.clan},afk:${client.afk}`
          );
        });
        return flattenedData;
      } catch (error) {
        console.error("Error processing data:", error);
        console.log("Raw dataArray:", JSON.stringify(dataArray, null, 2));
      }
    }
  }
}
__name(updateserverinfo, "updateserverinfo");
function checkAndPrintFriendsnew(newclientInfoArray, backlist) {
  const backlistSet = new Set(backlist.map((item) => item.friendname));
  const formattedIntersection = newclientInfoArray.map((item) => {
    const parts = item.split(",");
    const friendname = parts[0].split(":")[1];
    if (!friendname || !backlistSet.has(friendname)) {
      return null;
    }
    return {
      friendname,
      skin: parts[1].split(":")[1],
      servername: parts[2].split(":")[1],
      mapname: parts[3].split(":")[1],
      color_body: parts[4].split(":")[1],
      color_feet: parts[5].split(":")[1],
      warband: parts[6].split(":")[1],
      afk: parts[7].split(":")[1]
    };
  }).filter(Boolean);
  return formattedIntersection;
}
__name(checkAndPrintFriendsnew, "checkAndPrintFriendsnew");
async function apply(ctx, Config2) {
  ctx.model.extend(
    "ddnetfriendsdata",
    {
      // 各字段的类型声明
      id: "unsigned",
      userid: "string",
      friendname: "string",
      playername: "string"
    },
    {
      primary: "id",
      autoInc: true
    }
  );
  ctx.command("dd在线").action(async ({ session }) => {
    if (Config2?.useimage === true) {
      const htmldata = await ddlist(ctx);
      const qqid = session.userId;
      let backlist = await getlist(ctx, qqid);
      if (backlist.length === 0) {
        session.send("未找到相关数据,你似乎还没有导入好友列表");
        return;
      } else {
        let newclientInfoArray = updateserverinfo(htmldata);
        let allfriends = checkAndPrintFriendsnew(newclientInfoArray, backlist);
        if (allfriends.length === 0) {
          session.send("无在线好友");
          return;
        } else {
          let page;
          let context;
          let browser;
          let warband;
          let emoji;
          let colorbodyconfig;
          try {
            const nickname1 = allfriends;
            if (Config2?.enablewarband === true) {
              warband = true;
            } else {
              warband = false;
            }
            if (Config2?.enableemoji === true) {
              emoji = true;
            } else {
              emoji = false;
            }
            if (Config2?.colorbodyconfig === true) {
              colorbodyconfig = true;
            } else {
              colorbodyconfig = false;
            }
            const gethtml = await getimage(nickname1, warband, emoji, colorbodyconfig);
            browser = ctx.puppeteer.browser;
            context = await browser.createBrowserContext();
            page = await context.newPage();
            await page.setContent(gethtml);
            try {
              await page.waitForNetworkIdle({ idleTime: 500, timeout: 5e3 });
            } catch (error) {
              session.send("网络似乎开小差了", error);
              if (error.message && error.message.includes("Timeout")) {
                console.error("Timeout error detected.");
              }
              throw error;
            }
            const bodyHeight = await page.evaluate(() => {
              return document.body.scrollHeight;
            });
            const clip = {
              x: 0,
              // 起始点 x 坐标
              y: 0,
              // 起始点 y 坐标
              width: 315,
              // 截图宽度
              height: bodyHeight + 15
              // 截图高度
            };
            const image = await page.screenshot({ clip });
            await session.send(import_koishi.h.image(image, "image/png"));
          } catch (error) {
            ctx.logger.error("Error during Puppeteer operations:", error);
          } finally {
            if (page) {
              try {
                await page.close();
              } catch (e) {
                ctx.logger.error("Failed to close page:", e);
              }
            }
            if (context) {
              try {
                await context.close();
              } catch (e) {
                ctx.logger.error("Failed to close context:", e);
              }
            }
          }
        }
      }
    } else {
      const htmldata = await ddlist(ctx);
      let newclientInfoArray = updateserverinfo(htmldata);
      const qqid = session.userId;
      let backlist = await getlist(ctx, qqid);
      if (backlist.length === 0) {
        session.send("未找到相关数据,你似乎还没有导入好友列表");
        return;
      } else {
        let allfriends = checkAndPrintFriendsnew(newclientInfoArray, backlist);
        if (allfriends.length === 0) {
          session.send("无在线好友");
          return;
        } else {
          let resultString = allfriends.map((friend) => `${friend.friendname}
`).join("");
          session.send((0, import_koishi.h)("at", { id: session.userId }) + "你的在线好友:\n" + resultString);
          return;
        }
      }
    }
  });
  ctx.command("dd删除好友").action(async ({ session }) => {
    const userid = session.userId;
    session.send("输入好友列表，如 123,234,abc,支持单个或批量");
    if (session.content !== "") {
      const dispose = ctx.on("message", async (session2) => {
        const str = session2.content;
        const friendNames = str.split(",");
        const arrfriends = friendNames.map((friendName) => {
          return { "userid": userid, "friendname": friendName };
        });
        const deletesum = await deletefriend(ctx, userid, arrfriends);
        if (deletesum !== 0) {
          session2.send("已删除" + deletesum + "个好友");
          dispose();
        } else {
          session2.send("删除" + deletesum + "个好友，似乎没有找到匹配项");
          dispose();
        }
      });
    } else {
    }
  });
  ctx.command("dd添加好友").action(async ({ session }) => {
    session.send("请在游戏中点击皮肤目录,并返回上一级菜单,双击settings_ddnet.cfg,用笔记本或记事本打开,复制里面所有的内容粘贴过来\n输入:取消\n可以取消输入");
    const content = await session.prompt();
    if (content === "取消" || content === null) {
      await session.send("已取消输入");
      return;
    }
    const userid = session.userId;
    const str = await extractNames(content);
    const friendNames = str.split(",");
    const arrfriends = friendNames.map((friendName) => ({
      userid,
      friendname: friendName
    }));
    await addlist(ctx, arrfriends);
    return void session.send("添加成功");
  });
  ctx.command("添加玩家").action(async ({ session }) => {
    await addplayer(ctx, { session });
    return;
  });
  ctx.command("points [...args:string]").alias("查分").action(async ({ session, args }) => {
    if (args.length > 0) {
      const target = args.join(" ");
      await getpoints(ctx, { session }, target);
    } else {
      const target = null;
      await getpoints(ctx, { session }, target);
    }
  });
  ctx.command("删除玩家").action(async ({ session }) => {
    await deleteplayer(ctx, { session });
    return;
  });
}
__name(apply, "apply");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Config,
  apply,
  inject,
  name
});
