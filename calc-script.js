/***** 編集エリアへのカーソル位置での挿入 *****/
function appendToEditor(value) {
  const editor = document.getElementById('editor');
  if (editor.selectionStart || editor.selectionStart === 0) {
    let startPos = editor.selectionStart;
    let endPos = editor.selectionEnd;
    editor.value = editor.value.substring(0, startPos) + value + editor.value.substring(endPos);
    editor.selectionStart = startPos + value.length;
    editor.selectionEnd = startPos + value.length;
  } else {
    editor.value += value;
  }
  updateDisplay();
  editor.focus();
}

/***** 編集エリア＆表示更新 *****/
document.getElementById('editor').addEventListener('input', updateDisplay);

function updateDisplay() {
  const currentExpr = document.getElementById('editor').value;
  document.getElementById('display').innerHTML = `$$${currentExpr}$$`;
  MathJax.typeset();
}

function clearEditor() {
  document.getElementById('editor').value = "";
  updateDisplay();
  document.getElementById('result').setAttribute('data-latex', "");
  document.getElementById('resultText').innerHTML = "$$\\phantom{0}$$";
  MathJax.typeset();
}

document.getElementById('clear').addEventListener('click', clearEditor);

/***** CALCULATEボタン *****/
document.getElementById('calculate').addEventListener('click', runCalculation);

function runCalculation() {
  const input = document.getElementById('editor').value;

  // 省略乗算（例: 2x → 2*x）を補完
  const fixedInput = input.replace(/(\d)([a-zA-Z\\])/g, "$1*$2");

  try {
    // 字句解析
    const tokens = lex(fixedInput);
    console.log("Tokens:", tokens);
    
    // 構文解析
    const ast = parse(tokens);
    console.log("AST:", ast);
    
    // 計算と結果の生成
    let result;
    
    // 自作の評価関数を使用して計算と LaTeX 変換を行う
    result = evaluateExpressionToLatex(ast);
    
    // デバッグ情報
    console.log("Result:", result);

    // 結果の描画
    const resultDiv = document.getElementById('result');
    const latex = `$$${result.latex}$$`;
    resultDiv.setAttribute('data-latex', result.latex);
    resultDiv.innerHTML = `
      <button id="copyAnswer" title="LaTeX形式でコピー">📋</button>
      <span id="resultText">${latex}</span>
    `;
    MathJax.typeset();
  } catch (e) {
    console.error("Calculation error:", e);
    const resultDiv = document.getElementById('result');
    resultDiv.setAttribute('data-latex', '');
    resultDiv.innerHTML = `<span id="resultText">$$\\text{構文エラー}$$</span>`;
    MathJax.typeset();
  }
}

// 計算ボタンの登録
document.addEventListener('DOMContentLoaded', () => {
  const calcButton = document.getElementById('calculate');
  if (calcButton) {
    calcButton.addEventListener('click', runCalculation);
  }
});

// コピー機能
document.addEventListener('click', function(e) {
  if (e.target && e.target.id === 'copyAnswer') {
    const latex = document.getElementById('result').getAttribute('data-latex');
    navigator.clipboard.writeText(latex).then(() => {
      alert("LaTeX形式の答えをコピーしました");
    }).catch(() => {
      alert("コピーに失敗しました");
    });
  }
});

// ラジオボタン変更時にも結果を更新
function updateResultDisplay() {
  // 現在の表示モード（小数点または分数）を取得
  const displayMode = document.querySelector('input[name="displayMode"]:checked').value;
  
  // 結果が存在する場合のみ処理
  const resultDiv = document.getElementById('result');
  const latex = resultDiv.getAttribute('data-latex');
  
  if (latex && latex.trim() !== '') {
    try {
      // 表示モードに応じた処理を行う
      // 実際の処理はevaluateExpressionToLatex関数に依存するため、
      // ここでは再計算を行う
      runCalculation();
    } catch (e) {
      console.error('結果の更新に失敗しました:', e);
    }
  }
}

document.querySelectorAll('input[name="displayMode"]').forEach(radio => {
  radio.addEventListener('change', updateResultDisplay);
});

/***** キーパッドタブ処理 *****/
// キーパッドタブの切替
document.querySelectorAll('.keypad-tab-btn').forEach(button => {
  button.addEventListener('click', function() {
    document.querySelectorAll('.keypad-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.keypad-tab-contents').forEach(content => content.classList.remove('active'));
    this.classList.add('active');
    document.getElementById(this.getAttribute('data-tab')).classList.add('active');
  });
});

// キーパッドタブ内各ボタン（カーソル位置へ挿入）
document.querySelectorAll('.keypad-tab-contents button').forEach(button => {
  button.addEventListener('click', function() {
    let val = this.getAttribute('data-value');
    // 「・」ボタンの場合は "\cdot" を挿入
    if(val === "・") {
      val = "\\cdot";
    }
    appendToEditor(val);
  });
});

/***** 右側縦タブ処理 *****/
document.querySelectorAll('.tab-btn').forEach(button => {
  button.addEventListener('click', function() {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    this.classList.add('active');
    document.getElementById(this.getAttribute('data-tab')).classList.add('active');
  });
});

document.querySelectorAll('.tab-content button').forEach(button => {
  button.addEventListener('click', function() {
    // 「ベクトル記号」ボタンは行列テンプレート生成用に変更
    if(this.textContent.trim() === "ベクトル記号") {
      let rows = prompt("行数を入力してください", "2");
      let cols = prompt("列数を入力してください", "2");
      if(rows && cols) {
        let template = "\\begin{pmatrix}\n";
        for(let i = 0; i < rows; i++){
          let rowStr = "";
          for(let j = 0; j < cols; j++){
            rowStr += (j === 0 ? "" : " & ") + " ";
          }
          rowStr += (i < rows - 1 ? " \\\\\n" : "\n");
          template += rowStr;
        }
        template += "\\end{pmatrix}";
        appendToEditor(template);
      }
    } else {
      let val = this.getAttribute('data-value');
      appendToEditor(val);
    }
  });
  
  button.addEventListener('mouseenter', function() {
    const instr = this.getAttribute('data-input');
    updateButtonDescription(instr);
  });
  
  button.addEventListener('mouseleave', function() {
    updateButtonDescription("ボタンの説明がここに表示されます");
  });
});

/***** ボタン説明エリア更新 *****/
function updateButtonDescription(text) {
  document.getElementById('buttonDescription').innerText = text;
}
