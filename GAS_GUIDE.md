# Google Apps Script (GAS) 連携セットアップガイド

本ガイドでは、GitHub Pagesでホストしたランディングページ（LP）の登録フォームから、Google スプレッドシートへ自動でデータを保存し、登録完了メールを送信する仕組み（バックエンドAPI）の構築手順を説明します。

---

## 🛠️ ステップ 1：Google スプレッドシートの準備

1. **Google ドライブ**にアクセスし、新規の **Google スプレッドシート** を作成します。
2. シートのタイトルを任意のもの（例：「会員募集応募者リスト」）に変更します。
3. シートの1行目に、左から順番に以下の見出しを入力します。
   - A列: `タイムスタンプ`
   - B列: `お名前`
   - C列: `メールアドレス`

---

## 🛠️ ステップ 2：Google Apps Script (GAS) の設定

1. スプレッドシートのメニューバーから、**「拡張機能」＞「Apps Script」** をクリックします。
2. エディタが起動したら、最初から表示されている `myFunction` のコードをすべて消去します。
3. 以下のコードをコピーして貼り付けます。

```javascript
/**
 * フォームから送信されたデータを受け取って処理するAPI
 * @param {Object} e - POSTリクエストイベントオブジェクト
 */
function doPost(e) {
  // CORS対策用のレスポンスヘッダーを持つTextOutputを作成
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  
  try {
    // データの受け取りと解析
    var params;
    if (e.postData && e.postData.contents) {
      params = JSON.parse(e.postData.contents);
    } else {
      throw new Error("送信データが空です。");
    }

    var name = params.name;
    var email = params.email;

    // バリデーション
    if (!name || !email) {
      throw new Error("お名前、またはメールアドレスが入力されていません。");
    }
    
    // アクティブなスプレッドシートの最初のシートにデータを追記
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var timestamp = new Date();
    sheet.appendRow([timestamp, name, email]);
    
    // 【オプション】自動返信メールの送信
    // 必要に応じて以下のコメントアウトを解除し、件名や本文を調整してください。
    /*
    MailApp.sendEmail({
      to: email,
      subject: "【ご入会】会員登録お申し込みありがとうございます",
      body: name + " 様\n\n" +
            "この度はご登録いただき、誠にありがとうございます。\n" +
            "お申し込みを以下の内容で受け付けました。\n\n" +
            "----------------------------\n" +
            "■ お名前: " + name + "\n" +
            "■ メールアドレス: " + email + "\n" +
            "----------------------------\n\n" +
            "今後の詳細なご案内は、本メールアドレス宛てにお送りいたします。\n" +
            "引き続きよろしくお願いいたします。\n\n" +
            "コミュニティ運営事務局"
    });
    */
    
    // 成功レスポンス
    return output.setContent(JSON.stringify({ 
      status: "success", 
      message: "登録が正常に完了しました。" 
    }));
    
  } catch (error) {
    // エラーレスポンス
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

## 🛠️ ステップ 3：Webアプリとしてデプロイ

1. 画面右上の **「デプロイ」＞「新しいデプロイ」** をクリックします。
2. ギアマーク（種類の選択）をクリックし、**「ウェブアプリ」** を選択します。
3. 以下の設定を行います。
   - **説明:** `会員募集LP連携API`（任意）
   - **次のユーザーとして実行:** `自分 (あなたのGoogleアカウント)`
   - **アクセスできるユーザー:** `全員` (※重要: 「全員」にしないとGitHub Pages側からデータを送信できません)
4. **「デプロイ」** をクリックします。
5. 初回デプロイ時は、アクセス権限の承認を求められます。
   - **「アクセスの承認」** ボタンをクリックします。
   - 自分のGoogleアカウントを選択します。
   - 「このアプリは Google で確認されていません」という警告が出た場合は、左下の **「詳細」** をクリックし、一番下の **「xxxx（安全ではないページ）に移動」** をクリックします。
   - 権限を確認し、**「許可」** をクリックします。
6. デプロイ完了画面に表示される **「ウェブアプリのURL」** をコピーします。
   - URLの形式：`https://script.google.com/macros/s/XXXXXX/exec`

---

## 🛠️ ステップ 4：LPコード（HTML）へのURL設定

1. 本プロジェクトの `index.html` を開きます。
2. 75行目付近にある `const GAS_WEB_APP_URL = "ここにコピーしたGASのウェブアプリURLを貼り付け";` を探します。
3. `ここにコピーしたGASのウェブアプリURLを貼り付け` の部分を、**ステップ3でコピーしたURL**に書き換えます。

例：
```javascript
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycb.../exec";
```

4. ファイルを保存し、GitHubリポジトリへプッシュ（またはアップロード）します。

---

## 🔍 テストと確認方法

1. 公開された GitHub Pages もしくはローカルで起動した `index.html` にアクセスします。
2. フォームに「テスト 太郎」などの名前と、自身のメールアドレスを入力して「送信」をクリックします。
3. 送信ボタンが「送信中...」となり、その後「お申し込みを受け付けました！登録ありがとうございます。」という緑色のメッセージが表示されることを確認します。
4. Google スプレッドシートを開き、送信したデータ（タイムスタンプ、名前、メールアドレス）が即座に追加されていることを確認します。
5. （メール通知を有効にした場合）入力したメールアドレス宛てに自動返信メールが届いていることを確認します。
