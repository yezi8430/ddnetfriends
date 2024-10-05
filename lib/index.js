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
var import_path = __toESM(require("path"));
var import_fs = __toESM(require("fs"));
var fsPromises = import_fs.default.promises;
var koishi = require("koishi");
var fontPath = require.resolve("../font/seguiemj.ttf");
var fontBase64 = import_fs.default.readFileSync(fontPath, { encoding: "base64" });
var inject = { required: ["database"], optional: ["puppeteer"] };
var name = "ddnetfriends";
var Config = import_koishi.Schema.object({
  useimage: import_koishi.Schema.boolean().description("是否使用图片样式").default(true),
  enablewarband: import_koishi.Schema.boolean().description("是否显示战队(返回的数据以官网为准,如果好友不是该战队,可能是别人恰分改的ID？)").default(true),
  enableemoji: import_koishi.Schema.boolean().description("是否开启emoji,改善有些id或战队使用emoji表情的显示情况,但是有可能会影响加载速度(maybe)").default(false),
  colorbodyconfig: import_koishi.Schema.boolean().description("启用皮肤颜色,不过相比游戏内会显得更亮一点,自己看着要不要开关吧").default(false),
  Special_Attention: import_koishi.Schema.boolean().description("是否推送关注用户上线消息,发送失败的话可能要加机器人为好友(因为是私聊),如果关闭的话以下内容不会生效").default(false),
  Special_Attention_Interval_time: import_koishi.Schema.number().description("默认每个关注对象推送间隔为12小时(如果推送过一次之后则下次直到12小时后上线才推送").default(12),
  Special_Attention_listening: import_koishi.Schema.number().description("默认监听间隔,降低这个值可以减少查询的频率,默认监听间隔3分钟").default(3)
});
async function sendMessage(session, message) {
  try {
    if (session.event.channel.type === 1) {
      await session.bot.sendPrivateMessage(session.userId, message);
    } else {
      await session.send(message);
    }
  } catch (error) {
    console.error("发送消息时出错:", error);
  }
}
__name(sendMessage, "sendMessage");
async function updateSpecialAttention(ctx, userid, special_attention, session) {
  const userId = userid;
  const friendName = special_attention[0];
  const existingRecord = await ctx.database.get("ddnetfriendsdata", {
    userid: userId,
    friendname: friendName
  });
  if (existingRecord.length > 0) {
    if (existingRecord[0].Special_Attention === "yes") {
      return await sendMessage(session, "已经关注过这个人了哦");
    }
    await ctx.database.set("ddnetfriendsdata", {
      userid: userId,
      friendname: friendName
    }, {
      Special_Attention: "yes"
    });
  } else {
    await ctx.database.create("ddnetfriendsdata", {
      userid: userId,
      friendname: friendName,
      Special_Attention: "yes"
    });
  }
  return await sendMessage(session, "关注完成:" + special_attention);
}
__name(updateSpecialAttention, "updateSpecialAttention");
async function cancelSpecialAttention(ctx, userid, special_attention, session) {
  const userId = userid;
  const friendName = special_attention[0];
  const existingRecord = await ctx.database.get("ddnetfriendsdata", {
    userid: userId,
    friendname: friendName
  });
  if (existingRecord.length === 0 || existingRecord.length > 0 && existingRecord[0].Special_Attention === "") {
    return await sendMessage(session, "你根本没有关注这个人！");
  }
  if (existingRecord.length > 0) {
    await ctx.database.set("ddnetfriendsdata", {
      userid: userId,
      friendname: friendName
    }, {
      Special_Attention: ""
    });
    return await sendMessage(session, "取消关注:" + friendName);
  }
}
__name(cancelSpecialAttention, "cancelSpecialAttention");
async function fetchPlayerData(ctx, playerId, select, session) {
  try {
    const data = await ctx.http.get(`https://ddnet.org/players/?json2=${playerId}`, { responseType: "json" });
    if (Object.keys(data).length === 0) {
      await sendMessage(session, `未查询到玩家ID: ${playerId}`);
      return;
    }
    const selectNum = parseInt(select, 10);
    let mapType;
    switch (selectNum) {
      case 1:
        mapType = "Novice";
        break;
      case 2:
        mapType = "Moderate";
        break;
      case 3:
        mapType = "Brutal";
        break;
      case 4:
        mapType = "Insane";
        break;
      case 5:
        mapType = "Oldschool";
        break;
      case 7:
        mapType = "Dummy";
        break;
      case 8:
        mapType = "Solo";
        break;
      case 9:
        mapType = "Race";
        break;
      case 6:
        const ddmaxTypes = ["DDmaX.Easy", "DDmaX.Next", "DDmaX.Pro", "DDmaX.Nut"];
        let unfinishedMaps = [];
        ddmaxTypes.forEach((type) => {
          if (data.types && data.types[type] && data.types[type].maps) {
            const maps = data.types[type].maps;
            Object.keys(maps).filter((map) => maps[map].finishes === 0).forEach((map) => unfinishedMaps.push(`${map}(${maps[map].points} points - ${type})`));
          }
        });
        if (unfinishedMaps.length > 0) {
          await sendMessage(session, `${playerId} 在古典系列中尚未完成的地图，共计${unfinishedMaps.length}张:
${unfinishedMaps.join("\n")}`);
        } else {
          await sendMessage(session, `${playerId} 已完成所有古典系列的地图。`);
        }
        return;
      default:
        await sendMessage(session, "无效的选择，请选择1-9之间的数字。");
        return;
    }
    if (data.types && data.types[mapType] && data.types[mapType].maps) {
      const maps = data.types[mapType].maps;
      const unfinishedMaps = Object.keys(maps).filter((map) => maps[map].finishes === 0).map((map) => `${map}(${maps[map].points} points)`);
      if (unfinishedMaps.length > 0) {
        await sendMessage(session, (0, koishi.h)("message", { forward: true }, `${playerId} 在${mapType}类型中尚未完成的地图，共计${unfinishedMaps.length}张:
${unfinishedMaps.join("\n")}`));
      } else {
        await sendMessage(session, `${playerId} 已完成所有${mapType}类型的地图。`);
      }
    } else {
      await sendMessage(session, `无法获取 ${playerId} 的${mapType}地图数据。`);
    }
  } catch (error) {
    ctx.logger.error("获取数据时出错:", error);
    await sendMessage(session, `获取数据时出错: ${error.message}`);
  }
}
__name(fetchPlayerData, "fetchPlayerData");
async function ddlist(ctx) {
  const urls = [
    "https://master1.ddnet.org/ddnet/15/servers.json",
    "https://master2.ddnet.org/ddnet/15/servers.json",
    "https://master3.ddnet.org/ddnet/15/servers.json",
    "https://master4.ddnet.org/ddnet/15/servers.json",
    "https://master5.ddnet.org/ddnet/15/servers.json"
  ];
  const timeout = 5e3;
  const fetchWithTimeout = /* @__PURE__ */ __name((url) => {
    return ctx.http.get(url, {
      responseType: "json",
      timeout
    }).catch((error) => {
      ctx.logger(`请求 ${url} 失败: ${error.message}`);
      return Promise.reject(error);
    });
  }, "fetchWithTimeout");
  try {
    const result = await Promise.any(urls.map((url) => fetchWithTimeout(url)));
    return result;
  } catch (error) {
    ctx.logger.error("所有请求都失败了，可能是服务器炸了？", error);
    return null;
  }
}
__name(ddlist, "ddlist");
async function addplayer(ctx, { session }) {
  await sendMessage(session, "请输入要添加的玩家id");
  const input = await session.prompt(2e4);
  if (input && input.length !== 0)
    await ctx.database.create("ddnetfriendsdata", { userid: session.userId, playername: input });
  await sendMessage(session, "添加成功,玩家id:" + input);
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
    await sendMessage(session, `当前玩家列表：
${playerList}

请输入要删除的玩家序号：`);
    const input = await session.prompt(2e4);
    const index = parseInt(input) - 1;
    if (isNaN(index) || index < 0 || index >= validPlayers.length) {
      await sendMessage(session, "无效的输入，删除取消");
      return;
    }
    const playerToDelete = validPlayers[index];
    await ctx.database.remove("ddnetfriendsdata", {
      userid: session.userId,
      playername: playerToDelete.playername
    });
    await sendMessage(session, "删除成功，玩家: " + playerToDelete.playername);
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
      await sendMessage(session, "未找到匹配的玩家id,是否要添加");
      const input = await session.prompt(2e4);
      if (input && input.length !== 0) {
        await ctx.database.create("ddnetfriendsdata", { userid: session.userId, playername: input });
        await sendMessage(session, "添加成功,玩家id:" + input);
        return;
      } else {
        return;
      }
    } else if (playernamelist.length > 1) {
      const newPlayerArray = playernamelist.map((player) => player.playername);
      const formattedPlayerNames = newPlayerArray.map(
        (name2, index) => `${index + 1}.${name2}`
      ).join("\n");
      await sendMessage(session, "请输入要查询玩家的序号:\n" + formattedPlayerNames);
      const input = await session.prompt(2e4);
      if (input && input.length !== 0) {
        const inputNumber = parseInt(input);
        if (isNaN(inputNumber) || inputNumber < 1 || inputNumber > playernamelist.length) {
          await sendMessage(session, "无效输入。请输入一个有效的序号。");
          return;
        }
        try {
          const fetchPromises = await ctx.http.get(pointsurl + playernamelist[input - 1].playername, { responseType: "json" });
          if (fetchPromises && fetchPromises.player && fetchPromises.points) {
            const playerName = fetchPromises.player;
            const playerPoints = fetchPromises.points.points;
            const playerRank = fetchPromises.points.rank;
            await sendMessage(session, `${playerName}: ${playerPoints} 排名: ${playerRank}`);
          } else {
            await sendMessage(session, "没有查到这个玩家，看一下是不是输错id了吧");
          }
        } catch (error) {
          ctx.logger.error("获取玩家数据时出错:", error);
          await sendMessage(session, "获取玩家数据时出错，请稍后再试。");
        }
      } else {
        return;
      }
    } else {
      try {
        const fetchPromises = await ctx.http.get(pointsurl + playernamelist[0].playername, { responseType: "json" });
        if (fetchPromises && fetchPromises.player && fetchPromises.points) {
          const playerName = fetchPromises.player;
          const playerPoints = fetchPromises.points.points;
          const playerRank = fetchPromises.points.rank;
          await sendMessage(session, `${playerName}: ${playerPoints} 排名: ${playerRank}`);
        } else {
          await sendMessage(session, "没有查到这个玩家,看一下是不是输错id了吧");
        }
      } catch (error) {
        ctx.logger.error("获取数据时发生错误:", error);
        await sendMessage(session, "获取数据时发生错误,请稍后再试。");
      }
    }
  } catch (error) {
    await sendMessage(session, "网络似乎开了会儿小差" + error);
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
  const backlist = await ctx.database.get("ddnetfriendsdata", { userid: [qqid] }, ["friendname", "Special_Attention"]);
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
async function deleteallfriend(ctx, userid) {
  try {
    await ctx.database.remove("ddnetfriendsdata", { userid });
    return "已全部完成";
  } catch (error) {
    ctx.logger.error("删除好友失败: " + error.message);
    throw new Error("删除好友失败");
  }
}
__name(deleteallfriend, "deleteallfriend");
async function getimage(nickname1, warband, emoji, colorbodyconfig) {
  let newcolorbody;
  let colorbody;
  let special_attention_css = "";
  if (colorbodyconfig == true) {
    const processColorBody = /* @__PURE__ */ __name((colorBody) => {
      if (colorBody === "null" || colorBody === void 0) {
        return null;
      }
      let hex = parseInt(colorBody).toString(16).padStart(6, "0");
      let h2 = Math.round(parseInt(hex.slice(0, 2), 16) * 1.411);
      let s = Math.round(parseInt(hex.slice(2, 4), 16) * 0.392 - 1);
      let l = Math.round(parseInt(hex.slice(4, 6), 16) * 0.392 - 1);
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
  const skinDir = import_path.default.join(__dirname, "..", "skin");
  try {
    await fsPromises.access(skinDir, import_fs.default.constants.F_OK);
  } catch (error) {
    await fsPromises.mkdir(skinDir, { recursive: true });
  }
  const getDefaultSkin = /* @__PURE__ */ __name(async () => {
    const defaultSkinUrl = "https://ddnet.org/skins/skin/community/default.png";
    const defaultImagePath = import_path.default.join(skinDir, "default.png");
    try {
      const response = await fetch(defaultSkinUrl);
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        await fsPromises.writeFile(defaultImagePath, buffer);
        console.log("Default skin fetched from DDNet and cached.");
        return buffer;
      } else {
        throw new Error("Failed to fetch default skin from DDNet");
      }
    } catch (error) {
      console.error("Error fetching default skin:", error);
      throw error;
    }
  }, "getDefaultSkin");
  const imageurl = await Promise.all(nickname1.map(async (item) => {
    const skinName = item.skin;
    const localSkinPath = import_path.default.join(skinDir, `${skinName}.png`);
    const ddnetSkinUrl = `https://ddnet.org/skins/skin/community/${skinName}.png`;
    try {
      await fsPromises.access(localSkinPath, import_fs.default.constants.F_OK);
      const imageBuffer = await fsPromises.readFile(localSkinPath);
      const base64Image = imageBuffer.toString("base64");
      return `'data:image/png;base64,${base64Image}'`;
    } catch (error) {
      try {
        const response = await fetch(ddnetSkinUrl);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          await fsPromises.writeFile(localSkinPath, buffer);
          const base64Image = buffer.toString("base64");
          return `'data:image/png;base64,${base64Image}'`;
        } else {
          throw new Error("Skin not found on ddnet");
        }
      } catch (error2) {
        console.error(`Failed to fetch skin ${skinName}, using default.png`);
        try {
          const defaultImageBuffer = await fsPromises.readFile(import_path.default.join(skinDir, "default.png"));
          const base64Image = defaultImageBuffer.toString("base64");
          return `'data:image/png;base64,${base64Image}'`;
        } catch (defaultError) {
          console.error("Default skin not found, fetching from DDNet.");
          const defaultImageBuffer = await getDefaultSkin();
          const base64Image = defaultImageBuffer.toString("base64");
          return `'data:image/png;base64,${base64Image}'`;
        }
      }
    }
  }));
  for (let key in nickname1) {
    if (nickname1.hasOwnProperty(key)) {
      if (warband === true && nickname1[key].warband && nickname1[key].warband !== "null") {
        nickname1[key].warband = ` - [${nickname1[key].warband}]`;
      } else {
        nickname1[key].warband = "";
      }
      if (nickname1[key].afk == "true") {
        nickname1[key].afk = "afk";
      } else {
        nickname1[key].afk = "";
      }
      if (nickname1[key].Special_Attention == "") {
        special_attention_css = "";
      } else {
        special_attention_css = "special_attention_css";
        if (nickname1[key].afk == "afk") {
          special_attention_css = "special_attention_css_afk";
        }
      }
      div += `<div class="user-list">
                        <div class="user-item ${nickname1[key].afk} ${special_attention_css}">
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
            color: #f4f4f4;
            font-size: 0.8em;
            margin: 0;
        }
        .afk{
        background-color: #998500;
        }
        .special_attention_css{
        background-color: #ff8caa;
        }
        .special_attention_css_afk{
        background: linear-gradient(to right, #ff8caa, #998500);

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
function processImageColor(img, color, brightnessFactor = 0.6) {
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
            // 使用原始亮度调整新颜色，并应用亮度因子
            data[i] = Math.min(255, (rgb[0] * avg * brightnessFactor) / 150);
            data[i + 1] = Math.min(255, (rgb[1] * avg * brightnessFactor) / 150);
            data[i + 2] = Math.min(255, (rgb[2] * avg * brightnessFactor) / 150);
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
  const backlistMap = new Map(backlist.map((item) => [item.friendname, item.Special_Attention]));
  const formattedIntersection = newclientInfoArray.map((item) => {
    const parts = item.split(",");
    const friendname = parts[0].split(":")[1];
    if (!friendname || !backlistMap.has(friendname)) {
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
      afk: parts[7].split(":")[1],
      Special_Attention: backlistMap.get(friendname)
      // 添加 Special_Attention 字段
    };
  }).filter(Boolean);
  return formattedIntersection;
}
__name(checkAndPrintFriendsnew, "checkAndPrintFriendsnew");
async function apply(ctx, Config2, session) {
  const config = ctx.config;
  ctx.on("ready", async () => {
    const bots = ctx.bots;
    try {
      for (const bot of bots) {
        for await (const guild of bot.getGuildIter()) {
          for await (const member of bot.getGuildMemberIter(guild.id)) {
            try {
              await ctx.database.upsert("ddnet_group_data", [{
                guild_id: guild.id,
                user_id: member.user.id
                // 使用 user 对象的 id 属性
              }], ["guild_id", "user_id"]);
            } catch (error) {
              console.error(`数据库操作失败: ${error.message}`);
            }
          }
        }
      }
    } catch (error) {
      ctx.logger(`群组数据初始化失败: ${error.message}`);
    }
  });
  ctx.on("guild-member-added", async (session2) => {
    await ctx.database.upsert("ddnet_group_data", [{
      guild_id: session2.guildId,
      user_id: session2.userId
    }], ["guild_id", "user_id"]);
    console.log(`新成员加入：${session2.username}`);
  });
  ctx.on("guild-member-removed", async (session2) => {
    await ctx.database.remove("ddnet_group_data", {
      guild_id: session2.guildId,
      user_id: session2.userId
    });
    console.log(`成员退出：${session2.username}`);
  });
  ctx.model.extend(
    "ddnetfriendsdata",
    {
      // 各字段的类型声明
      id: "unsigned",
      userid: "string",
      friendname: "string",
      playername: "string",
      Special_Attention: "string"
    },
    {
      primary: "id",
      autoInc: true
    }
  );
  ctx.model.extend("ddnet_group_data", {
    id: "unsigned",
    guild_id: "string",
    user_id: "string",
    last_sent_time: "string",
    friendname: "string"
  }, {
    primary: "id",
    autoInc: true
  });
  let allfriends, newclientInfoArray, special_attention_newclientInfoArray;
  async function get_Special_Attention(ctx2) {
    const backlist = await ctx2.database.get("ddnetfriendsdata", { Special_Attention: "yes" }, ["userid", "friendname"]);
    return backlist;
  }
  __name(get_Special_Attention, "get_Special_Attention");
  function findMatchingFriendnames(special_attention_newclientInfoArray2, backlist) {
    const Special_Attention_online = [];
    special_attention_newclientInfoArray2.forEach((clientInfo) => {
      const friendnameMatch = clientInfo.match(/friendname:([^,]+)/);
      if (friendnameMatch) {
        const friendname = friendnameMatch[1];
        if (friendname !== "null") {
          const backlistEntry = backlist.find((entry) => entry && entry.friendname === friendname);
          if (backlistEntry) {
            const userid = backlistEntry.userid || "unknown";
            Special_Attention_online.push(`friendname:${friendname},userid:${userid}`);
          }
        }
      }
    });
    return Special_Attention_online;
  }
  __name(findMatchingFriendnames, "findMatchingFriendnames");
  if (ctx.config.Special_Attention === true) {
    ctx.setInterval(async () => {
      try {
        const special_attention_htmldata = await ddlist(ctx);
        special_attention_newclientInfoArray = await updateserverinfo(special_attention_htmldata);
        const Special_Attention = await get_Special_Attention(ctx);
        const Special_Attention_online = await findMatchingFriendnames(special_attention_newclientInfoArray, Special_Attention);
        const groupData = await ctx.database.get("ddnet_group_data", {});
        const sentCombinations = /* @__PURE__ */ new Set();
        const now = Date.now();
        for (const item of Special_Attention_online) {
          const [friendnamePart, useridPart] = item.split(",");
          const friendname = friendnamePart.split(":")[1];
          const ddnetUserId = useridPart.split(":")[1];
          const existingRecord = groupData.find((data) => data.user_id === ddnetUserId && data.friendname === friendname);
          if (existingRecord) {
            const lastSentTime = existingRecord.last_sent_time ? parseInt(existingRecord.last_sent_time) : 0;
            if (now - lastSentTime < ctx.config.Special_Attention_Interval_time * 60 * 60 * 1e3) {
              continue;
            }
          }
          if (!sentCombinations.has(`${ddnetUserId}-${friendname}`)) {
            try {
              await ctx.bots[0].sendPrivateMessage(ddnetUserId, `你关注的好友 ${friendname} 偷偷上线了`);
              sentCombinations.add(`${ddnetUserId}-${friendname}`);
              if (existingRecord) {
                await ctx.database.set("ddnet_group_data", { user_id: ddnetUserId, friendname }, {
                  last_sent_time: now.toString()
                });
              } else {
                await ctx.database.create("ddnet_group_data", {
                  user_id: ddnetUserId,
                  friendname,
                  last_sent_time: now.toString()
                });
              }
            } catch (sendError) {
              ctx.logger.error(sendError);
            }
          }
        }
        const cleanupTime = now - ctx.config.Special_Attention_Interval_time * 60 * 60 * 1e3;
        await ctx.database.remove("ddnet_group_data", { last_sent_time: { $lt: cleanupTime.toString() } });
      } catch (error) {
        ctx.logger.error("发生错误：" + error);
        ctx.logger.error("错误堆栈：" + error.stack);
        ctx.logger.error("发生错误，请检查日志。");
      }
    }, ctx.config.Special_Attention_listening * 60 * 1e3);
  }
  const SCREENSHOT_WIDTH = 315;
  const NETWORK_IDLE_TIMEOUT = 5e3;
  const SCREENSHOT_PADDING = 15;
  ctx.command("dd在线", "输入‘帮助 dd在线’查看其他命令").action(async ({ session: session2 }) => {
    try {
      const qqid = session2.userId;
      const [htmldata, backlist] = await Promise.all([
        ddlist(ctx),
        getlist(ctx, qqid)
      ]);
      if (backlist.length === 0) {
        await sendMessage(session2, "未找到相关数据,你似乎还没有导入好友列表");
        return;
      }
      const newclientInfoArray2 = updateserverinfo(htmldata);
      const allfriends2 = checkAndPrintFriendsnew(newclientInfoArray2, backlist);
      if (allfriends2.length === 0) {
        await sendMessage(session2, "无在线好友");
        return;
      }
      if (Config2?.useimage === true) {
        await handleImageOutput(ctx, session2, allfriends2, ctx.puppeteer.browser, Config2);
      } else {
        await handleTextOutput(session2, allfriends2);
      }
    } catch (error) {
      ctx.logger.error("Error during operation:", error);
      await sendMessage(session2, "操作过程中发生错误，请稍后再试");
    }
  });
  async function handleImageOutput(ctx2, session2, allfriends2, browser, config2) {
    let context, page;
    try {
      const { enablewarband, enableemoji, colorbodyconfig } = config2;
      const gethtml = await getimage(allfriends2, enablewarband, enableemoji, colorbodyconfig);
      context = await browser.createBrowserContext();
      page = await context.newPage();
      await page.setContent(gethtml);
      await Promise.race([
        page.waitForNetworkIdle({ idleTime: 500, timeout: NETWORK_IDLE_TIMEOUT }),
        new Promise((resolve) => setTimeout(resolve, NETWORK_IDLE_TIMEOUT))
      ]);
      const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
      const clip = { x: 0, y: 0, width: SCREENSHOT_WIDTH, height: bodyHeight + SCREENSHOT_PADDING };
      const image = await page.screenshot({ clip });
      await sendMessage(session2, import_koishi.h.image(image, "image/png"));
    } catch (error) {
      ctx2.logger.error("Error in handleImageOutput:", error);
      await sendMessage(session2, "生成图片时发生错误，请稍后再试");
    } finally {
      if (page) await page.close().catch((e) => ctx2.logger.error("Failed to close page:", e));
      if (context) await context.close().catch((e) => ctx2.logger.error("Failed to close context:", e));
    }
  }
  __name(handleImageOutput, "handleImageOutput");
  async function handleTextOutput(session2, allfriends2) {
    const resultString = allfriends2.map((friend) => `${friend.friendname}
`).join("");
    await sendMessage(session2, (0, import_koishi.h)("at", { id: session2.userId }) + "你的在线好友:\n" + resultString);
  }
  __name(handleTextOutput, "handleTextOutput");
  ctx.command("dd在线").subcommand("dd删除好友").action(async ({ session: session2 }) => {
    const userid = session2.userId;
    try {
      await sendMessage(session2, "输入好友列表，如 123,234,abc,支持单个或批量");
      const content = await session2.prompt(15e3);
      if (!content) {
        await sendMessage(session2, "操作超时，已取消。");
        return;
      }
      const friendNames = content.split(",");
      const arrfriends = friendNames.map((friendName) => {
        return { "userid": userid, "friendname": friendName };
      });
      const deletesum = await deletefriend(ctx, userid, arrfriends);
      if (deletesum !== 0) {
        await sendMessage(session2, "已删除" + deletesum + "个好友");
        return;
      } else {
        await sendMessage(session2, "删除" + deletesum + "个好友，似乎没有找到匹配项");
        return;
      }
    } catch (error) {
      await sendMessage(session2, "发生错误：" + error.message);
      return;
    }
  });
  ctx.command("dd在线").subcommand("dd删除全部好友").action(async ({ session: session2 }) => {
    const userid = session2.userId;
    await sendMessage(session2, await deleteallfriend(ctx, userid));
    return;
  });
  ctx.command("dd在线").subcommand("dd添加好友").action(async ({ session: session2 }) => {
    await sendMessage(session2, "请在游戏中点击皮肤目录,并返回上一级菜单,双击settings_ddnet.cfg,用笔记本或记事本打开,复制里面所有的内容粘贴过来\n输入:取消\n可以取消输入");
    const content = await session2.prompt();
    if (content === "取消" || content === null) {
      await sendMessage(session2, "已取消输入");
      return;
    }
    const userid = session2.userId;
    const str = await extractNames(content);
    const friendNames = str.split(",");
    const arrfriends = friendNames.map((friendName) => ({
      userid,
      friendname: friendName
    }));
    await addlist(ctx, arrfriends);
    await sendMessage(session2, "添加成功");
    return;
  });
  ctx.command("dd在线").subcommand("添加玩家").action(async ({ session: session2 }) => {
    await addplayer(ctx, { session: session2 });
    return;
  });
  ctx.command("dd在线").subcommand("points [...args:string]").alias("查分").action(async ({ session: session2, args }) => {
    if (args.length > 0) {
      const target = args.join(" ");
      await getpoints(ctx, { session: session2 }, target);
    } else {
      const target = null;
      await getpoints(ctx, { session: session2 }, target);
    }
  });
  ctx.command("dd在线").subcommand("地图情况 [...args:string]").action(async ({ session: session2, args }) => {
    if (args.length > 0) {
      await sendMessage(session2, "请输入要查询的序列号\n1.简单图(Novice)\n2.中阶图(Moderate)\n3.高阶图(Brutal)\n4.疯狂图(Insane)\n5.传统图(Oldschool)\n6.古典图(DDmaX)\n7.分身图(Dummy)\n8.单人图(Solo)\n9.竞速图(Race)");
      const select = await session2.prompt(1e4);
      if (!select) return;
      else fetchPlayerData(ctx, args, select, session2);
    } else {
      await sendMessage(session2, "未输入玩家ID,请重新输入\n如 地图情况 我的ID");
      return;
    }
  });
  ctx.command("dd在线").subcommand("删除玩家").action(async ({ session: session2 }) => {
    await deleteplayer(ctx, { session: session2 });
    return;
  });
  ctx.command("dd在线").subcommand("关注 [...args:string]").action(async ({ session: session2, args }) => {
    if (args.length > 0) {
      let special_sttention = args;
      let userid = session2.userId;
      return await updateSpecialAttention(ctx, userid, special_sttention, session2);
    } else {
      await sendMessage(session2, "未输入玩家ID，请重新输入\n如 关注 我的ID");
      return;
    }
  });
  ctx.command("dd在线").subcommand("取消关注 [...args:string]").action(async ({ session: session2, args }) => {
    if (args.length > 0) {
      let special_sttention = args;
      let userid = session2.userId;
      return await cancelSpecialAttention(ctx, userid, special_sttention, session2);
    } else {
      await sendMessage(session2, "未输入玩家ID，请重新输入\n如 取消关注 我的ID");
      return;
    }
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
