# Google Apps Script (GAS) 連携セットアップガイド（画像投稿・スレッド返信・いいね対応版）

本ガイドでは、掲示板機能の高度化（画像投稿、スレッド返信、いいね機能）を実現するために、画像の保存処理やいいね数のインクリメント、スレッド親子構造の管理に対応した最新のGASバックエンドを構築する手順を説明します。

---

## 🛠️ ステップ 1：スプレッドシートの準備

- 以前に作成したスプレッドシートを引き続き利用できます。
- GASコードの実行時に、シート「掲示板」が自動的に新しい構成（列: `ID`、`親ID`、`タイムスタンプ`、`ニックネーム`、`趣味ジャンル`、`一言コメント`、`画像URL`、`いいね数`）で再生成・拡張されます。すでに「掲示板」シートがあり、以前のテストデータが含まれている場合は、古いシートを削除するか、名前を「掲示板_old」に変更しておくと、GASが新規に正しい列のシートを作成します。

---

## 🛠️ ステップ 2：最新の GAS コードの貼り付け

1. スプレッドシートのメニューバーから、**「拡張機能」＞「Apps Script」** をクリックします。
2. エディタに記述されている既存のコードをすべて消去します。
3. 以下の統合コードをコピーして貼り付けます。

```javascript
/**
 * 掲示板メッセージ一覧の取得 (GETリクエスト)
 * @param {Object} e - GETリクエストイベントオブジェクト
 */
function doGet(e) {
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("掲示板");
    
    // 「掲示板」シートが存在しない場合は自動で作成
    if (!sheet) {
      sheet = ss.insertSheet("掲示板");
      sheet.appendRow(["ID", "親ID", "タイムスタンプ", "ニックネーム", "趣味ジャンル", "一言コメント", "画像URL", "いいね数"]);
    }
    
    var data = [];
    var lastRow = sheet.getLastRow();
    
    if (lastRow > 1) {
      // 全列（8列）を取得 (ID, 親ID, タイムスタンプ, ニックネーム, 趣味ジャンル, 一言コメント, 画像URL, いいね数)
      var rows = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
      for (var i = 0; i < rows.length; i++) {
        data.push({
          id: String(rows[i][0]),
          parentId: String(rows[i][1]),
          timestamp: rows[i][2],
          nickname: rows[i][3],
          category: rows[i][4],
          comment: rows[i][5],
          imageUrl: rows[i][6],
          likes: Number(rows[i][7] || 0)
        });
      }
    }
    
    return output.setContent(JSON.stringify({
      status: "success",
      data: data
    }));
    
  } catch (error) {
    return output.setContent(JSON.stringify({
      status: "error",
      message: error.toString()
    }));
  }
}

/**
 * データの書き込み・更新 (POSTリクエスト)
 * @param {Object} e - POSTリクエストイベントオブジェクト
 */
function doPost(e) {
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  
  try {
    var params;
    if (e.postData && e.postData.contents) {
      params = JSON.parse(e.postData.contents);
    } else {
      throw new Error("送信データが空です。");
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // ------------------------------------------
    // 1. いいねの処理 (like)
    // ------------------------------------------
    if (params.action === "like") {
      var id = params.id;
      if (!id) throw new Error("IDが指定されていません。");
      
      var sheet = ss.getSheetByName("掲示板");
      if (!sheet) throw new Error("掲示板シートが存在しません。");
      
      var lastRow = sheet.getLastRow();
      if (lastRow <= 1) throw new Error("データがありません。");
      
      // ID列 (A列) をスキャンして一致する行を特定
      var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      var foundRow = -1;
      for (var i = 0; i < ids.length; i++) {
        if (String(ids[i][0]) === String(id)) {
          foundRow = i + 2; // ヘッダー行と0から始まるインデックスを加味
          break;
        }
      }
      
      if (foundRow === -1) throw new Error("該当する投稿が見つかりません。");
      
      // H列 (8列目) のいいね数を取得して+1して再書き込み
      var likesRange = sheet.getRange(foundRow, 8);
      var currentLikes = Number(likesRange.getValue() || 0);
      likesRange.setValue(currentLikes + 1);
      
      return output.setContent(JSON.stringify({ 
        status: "success", 
        message: "いいねを追加しました。" 
      }));
    }
    
    // ------------------------------------------
    // 2. メッセージの投稿 (postMessage)
    // ------------------------------------------
    else if (params.action === "postMessage") {
      var sheet = ss.getSheetByName("掲示板");
      if (!sheet) {
        sheet = ss.insertSheet("掲示板");
        sheet.appendRow(["ID", "親ID", "タイムスタンプ", "ニックネーム", "趣味ジャンル", "一言コメント", "画像URL", "いいね数"]);
      }
      
      var parentId = params.parentId || ""; // 親メッセージID (なければ空)
      var nickname = params.nickname;
      var hobbyCategory = params.hobbyCategory || ""; // 返信の場合は空になりうる
      var comment = params.comment;
      
      if (!nickname || !comment) {
        throw new Error("ニックネームまたはコメントが不足しています。");
      }
      
      // 一意なメッセージIDの生成 (タイムスタンプ + ランダム文字列)
      var messageId = new Date().getTime() + "-" + Math.random().toString(36).substring(2, 8);
      
      // 画像のアップロード処理 (親メッセージのみ且つ画像が添付されている場合)
      var imageUrl = "";
      if (!parentId && params.photoData) {
        imageUrl = uploadImageToDrive(params.photoData, params.photoName, params.photoType);
      }
      
      // データの追記 (ID, 親ID, タイムスタンプ, ニックネーム, 趣味ジャンル, 一言コメント, 画像URL, いいね数)
      sheet.appendRow([messageId, parentId, new Date(), nickname, hobbyCategory, comment, imageUrl, 0]);
      
      return output.setContent(JSON.stringify({ 
        status: "success", 
        message: "メッセージが投稿されました。" 
      }));
    }
    
    // ------------------------------------------
    // 3. 会員登録の申し込み (register)
    // ------------------------------------------
    else {
      var sheet = ss.getSheetByName("申し込み");
      if (!sheet) {
        sheet = ss.insertSheet("申し込み");
        sheet.appendRow(["タイムスタンプ", "お名前", "メールアドレス"]);
      }
      
      var name = params.name;
      var email = params.email;
      
      if (!name || !email) {
        throw new Error("お名前、またはメールアドレスが入力されていません。");
      }
      
      sheet.appendRow([new Date(), name, email]);
      
      return output.setContent(JSON.stringify({ 
        status: "success", 
        message: "登録が正常に完了しました。" 
      }));
    }
    
  } catch (error) {
    return output.setContent(JSON.stringify({ 
      status: "error", 
      message: error.toString() 
    }));
  }
}

/**
 * Googleドライブの「LP_Upload_Images」フォルダに画像を保存するヘルパー
 * @param {string} base64Data - Base64形式の画像データ ("data:image/png;base64,..."等)
 * @param {string} fileName - 保存するファイル名
 * @param {string} mimeType - 画像のMIMEタイプ
 * @return {string} 画像の公開アクセスURL
 */
function uploadImageToDrive(base64Data, fileName, mimeType) {
  var folderName = "LP_Upload_Images";
  var folders = DriveApp.getFoldersByName(folderName);
  var folder;
  
  // フォルダが存在しない場合は新規作成
  if (folders.hasNext()) {
    folder = folders.next();
  } else {
    folder = DriveApp.createFolder(folderName);
  }
  
  // Base64データからヘッダー（data:image/png;base64,等）をトリミングしてデコード
  var base64Image = base64Data.split(",")[1];
  var decoded = Utilities.base64Decode(base64Image);
  var blob = Utilities.newBlob(decoded, mimeType, fileName);
  
  // ファイルを作成して共有権限を「リンクを知っている全員に閲覧許可」に変更
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  // Webページの<img>タグで直接読み込める形式のURLを生成して返却
  return "https://drive.google.com/uc?export=view&id=" + file.getId();
}

/**
 * プリフライトリクエスト (OPTIONS) に対するCORS対応
 */
function doOptions(e) {
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  return output.setContent(JSON.stringify({ status: "success" }));
}
```

4. エディタ上部の **「保存（フロッピーディスクのアイコン）」** をクリックしてプロジェクトを保存します。

---

## 🛠️ ステップ 3：新バージョンとしてデプロイを更新

GETおよびPOSTの内容に変更が加わったため、必ず新バージョンとしてデプロイを更新します。

1. 右上の **「デプロイ」＞「デプロイの管理」** をクリックします。
2. 鉛筆マーク（編集）をクリックします。
3. **バージョン** のドロップダウンメニューから **「新バージョン」** を選択します。
4. **「デプロイ」** をクリックします。
5. （初回時のみ）Googleドライブ内のファイル作成・共有処理を行うための権限承認ウィンドウが出るので、画面の指示に従ってアクセス権を「許可」します。
6. コピーしたURLを `index.html` に設定してデプロイを完了させてください。
