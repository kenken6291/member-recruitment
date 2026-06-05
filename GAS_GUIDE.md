# Google Apps Script (GAS) 連携セットアップガイド（GET/POST両対応版）

本ガイドでは、GitHub PagesのLPに新設した「交流スペース（掲示板）」の機能を実現するために、メッセージの取得（GET）および投稿・会員登録（POST）の両方に対応した最新のGASバックエンドを構築する手順を説明します。

---

## 🛠️ ステップ 1：Google スプレッドシートの準備

1. 以前作成した、あるいは新規の **Google スプレッドシート** を開きます。
2. シートの1行目の見出し（ヘッダー）を手動で設定する必要はありません。GASの新しいコードが実行時に、必要なシート（`申し込み` と `掲示板`）を**自動作成**し、自動でヘッダー列を追加します。

---

## 🛠️ ステップ 2：最新の GAS コードの貼り付け

1. スプレッドシートのメニューバーから、**「拡張機能」＞「Apps Script」** をクリックします。
2. エディタに記述されている既存のコードをすべて消去します。
3. 以下の統合コード（GETおよびPOST分岐対応）をコピーして貼り付けます。

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
      sheet.appendRow(["タイムスタンプ", "ニックネーム", "趣味ジャンル", "一言コメント"]);
    }
    
    var data = [];
    var lastRow = sheet.getLastRow();
    
    if (lastRow > 1) {
      // 2行目以降の全データを取得
      var rows = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
      
      // 最新の投稿が上に表示されるように、逆順で最大50件分配列に追加
      var start = Math.max(0, rows.length - 50);
      for (var i = rows.length - 1; i >= start; i--) {
        data.push({
          timestamp: rows[i][0],
          nickname: rows[i][1],
          category: rows[i][2],
          comment: rows[i][3]
        });
      }
    }
    
    // CORSエラー回避のため、JSONとして返却
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
 * データの書き込み (POSTリクエスト)
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

    // 処理の分岐 (掲示板のメッセージ投稿)
    if (params.action === "postMessage") {
      var sheet = ss.getSheetByName("掲示板");
      if (!sheet) {
        sheet = ss.insertSheet("掲示板");
        sheet.appendRow(["タイムスタンプ", "ニックネーム", "趣味ジャンル", "一言コメント"]);
      }
      
      var nickname = params.nickname;
      var hobbyCategory = params.hobbyCategory;
      var comment = params.comment;
      
      if (!nickname || !hobbyCategory || !comment) {
        throw new Error("入力項目が不足しています。");
      }
      
      // データの追加
      sheet.appendRow([new Date(), nickname, hobbyCategory, comment]);
      
      return output.setContent(JSON.stringify({ 
        status: "success", 
        message: "メッセージが投稿されました。" 
      }));
      
    } else {
      // 処理の分岐 (メンバーシップ申し込み登録)
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
      
      // データの追加
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

## 🛠️ ステップ 3：新しいデプロイとして公開

GASのコードを更新（`doGet`の追加など）した後は、**既存のデプロイを更新するか、新しいデプロイを作成する**必要があります。デプロイを更新しないと、古いバージョンのコード（申し込み登録のみ）が実行され続けてしまいます。

1. 画面右上の **「デプロイ」＞「デプロイの管理」** をクリックします。
2. 鉛筆マーク（編集）をクリックします。
3. **バージョン** のドロップダウンメニューから **「新バージョン」** を選択します。
4. **「デプロイ」** をクリックします。
5. 更新された「ウェブアプリのURL」をコピーし、念のためLP（`index.html`のGAS_WEB_APP_URL変数）と一致しているか確認します。
   - URLが変更されている場合は、`index.html` の75行目の定数を新しいURLに書き換えて、GitHubにコミット＆プッシュしてください。
