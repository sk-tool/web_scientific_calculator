/**
 * 抽象構文木（AST）を文字列に変換する関数
 * 計算エンジン（math.js）で評価できる形式に変換します
 * @param {Object} node - 抽象構文木のノード
 * @returns {string} - 計算エンジンで評価可能な文字列
 */
function astToString(node) {
  if (!node) return '';
  
  switch (node.type) {
    case 'NumberLiteral':
      return node.value;
      
    case 'Identifier':
      // 特殊定数の変換
      if (node.value === 'π') return 'pi';
      if (node.value === 'τ') return '2*pi';
      if (node.value === 'φ') return '(1+sqrt(5))/2'; // 黄金比
      return node.value;
      
    case 'BinaryExpression':
      const left = astToString(node.left);
      const right = astToString(node.right);
      
      // 演算子の優先順位に基づいて括弧を付ける
      const needsParensLeft = needsParentheses(node.left, node, 'left');
      const needsParensRight = needsParentheses(node.right, node, 'right');
      
      const leftStr = needsParensLeft ? `(${left})` : left;
      const rightStr = needsParensRight ? `(${right})` : right;
      
      return `${leftStr}${node.operator}${rightStr}`;
      
    case 'UnaryExpression':
      const operand = astToString(node.operand);
      // 単項演算子の場合、オペランドが複合式なら括弧が必要
      const needsParens = needsParenthesesForUnary(node.operand);
      return `${node.operator}${needsParens ? `(${operand})` : operand}`;
      
    case 'FunctionCall':
      // \frac コマンドの特別処理
      if (node.name === '\\frac') {
        if (node.arguments.length === 2) {
          const numerator = astToString(node.arguments[0]);
          const denominator = astToString(node.arguments[1]);
          
          return `(${numerator})/(${denominator})`;
        }
      }
      // その他の関数
      const funcName = node.name.replace('\\', '');
      const args = node.arguments.map(astToString).join(',');
      return `${funcName}(${args})`;
      
    case 'ParenthesizedExpression':
      return `(${astToString(node.expression)})`;
      
    case 'ArrayExpression':
      return `[${node.elements.map(astToString).join(',')}]`;
      
    case 'MatrixExpression':
      // 行列を math.js の matrix() 関数に変換
      const rows = node.rows.map(row => 
        `[${row.map(astToString).join(',')}]`
      ).join(',');
      return `matrix([${rows}])`;
      
    case 'ComparisonExpression':
      const leftComp = astToString(node.left);
      const rightComp = astToString(node.right);
      return `${leftComp}${node.operator}${rightComp}`;
      
    case 'AssignmentExpression':
      const leftAssign = astToString(node.left);
      const rightAssign = astToString(node.right);
      return `${leftAssign}=${rightAssign}`;
      
    default:
      console.warn(`未知のノードタイプ: ${node.type}`);
      return '';
  }
}

/**
 * 二項演算子の優先順位を返す関数
 * @param {string} operator - 演算子
 * @returns {number} - 優先順位（数値が大きいほど優先度が高い）
 */
function getOperatorPrecedence(operator) {
  const precedence = {
    '=': 1,
    '<': 2, '>': 2, '<=': 2, '>=': 2, '!=': 2,
    '+': 3, '-': 3,
    '*': 4, '/': 4,
    '^': 5
  };
  
  return precedence[operator] || 0;
}

/**
 * 二項演算の左右の項に括弧が必要かどうかを判定する関数
 * @param {Object} childNode - 子ノード
 * @param {Object} parentNode - 親ノード
 * @param {string} position - 子ノードの位置（'left' または 'right'）
 * @returns {boolean} - 括弧が必要な場合は true
 */
function needsParentheses(childNode, parentNode, position) {
  // 子ノードが二項演算式でない場合は括弧不要
  if (!childNode || childNode.type !== 'BinaryExpression') {
    return false;
  }
  
  const parentPrecedence = getOperatorPrecedence(parentNode.operator);
  const childPrecedence = getOperatorPrecedence(childNode.operator);
  
  // 親の優先度が子より高い場合は括弧が必要
  if (parentPrecedence > childPrecedence) {
    return true;
  }
  
  // 同じ優先度の場合
  if (parentPrecedence === childPrecedence) {
    // 右結合演算子（累乗など）の場合
    if (parentNode.operator === '^') {
      return position === 'right' && childNode.operator === '^';
    }
    
    // 左結合演算子の場合、右側の子に括弧が必要
    return position === 'right';
  }
  
  return false;
}

/**
 * 単項演算子の項に括弧が必要かどうかを判定する関数
 * @param {Object} node - 評価するノード
 * @returns {boolean} - 括弧が必要な場合は true
 */
function needsParenthesesForUnary(node) {
  if (!node) return false;
  
  // 二項演算式、比較式、代入式の場合は括弧が必要
  return node.type === 'BinaryExpression' || 
         node.type === 'ComparisonExpression' || 
         node.type === 'AssignmentExpression';
}

/**
 * 記号（変数）を含むかチェックする関数
 * @param {Object} node - 抽象構文木のノード
 * @returns {boolean} - 変数を含む場合は true
 */
function containsSymbols(node) {
  if (!node) return false;
  
  switch (node.type) {
    case 'Identifier':
      // 既知の定数以外の識別子は変数とみなす
      const isVariable = node.value !== 'e' && 
                         node.value !== 'pi' && 
                         node.value !== 'π' && 
                         node.value !== 'i';
      
      // 変数を検出した場合はログ出力
      if (isVariable) {
        console.log(`Variable detected: ${node.value}`);
      }
      
      return isVariable;
             
    case 'BinaryExpression':
    case 'ComparisonExpression':
    case 'AssignmentExpression':
      const leftContains = containsSymbols(node.left);
      const rightContains = containsSymbols(node.right);
      return leftContains || rightContains;
      
    case 'UnaryExpression':
      return containsSymbols(node.operand);
      
    case 'FunctionCall':
      return node.arguments.some(containsSymbols);
      
    case 'ParenthesizedExpression':
      return containsSymbols(node.expression);
      
    case 'ArrayExpression':
      return node.elements.some(containsSymbols);
      
    case 'MatrixExpression':
      return node.rows.some(row => row.some(containsSymbols));
      
    default:
      return false;
  }
}

/**
 * 代数的計算を行う関数
 * @param {string} exprStr - 式の文字列表現
 * @returns {string} - 計算結果の文字列表現
 */
function performAlgebraicCalculation(exprStr) {
  console.log("Performing algebraic calculation for:", exprStr);
  
  // nerdamerが利用可能かチェック
  if (!isNerdamerAvailable()) {
    console.log("Nerdamer is not available, using math.js for algebraic calculation");
    try {
      const mathResult = math.simplify(exprStr).toString();
      console.log("Math.js simplification result:", mathResult);
      return mathResult;
    } catch (mathError) {
      console.error("Math.js simplification error:", mathError);
      return exprStr; // 計算に失敗した場合は元の式を返す
    }
  }
  
  try {
    // nerdamerインスタンスを取得
    const nerdamerInstance = getNerdamer();
    if (!nerdamerInstance) {
      throw new Error("Nerdamer is not available");
    }
    
    // 入れ子になった分数式を含む場合の特別処理
    if (exprStr.includes('/') && (exprStr.indexOf('/') !== exprStr.lastIndexOf('/'))) {
      console.log("Nested fraction detected, using special handling");
      
      try {
        // nerdamerを使用して代数的に計算
        const nerdamerExpr = nerdamerInstance(exprStr);
        
        // 式を展開
        const expanded = nerdamerExpr.expand();
        console.log("Expanded expression:", expanded.text());
        
        // 式を単純化
        const simplified = expanded.simplify();
        console.log("Simplified expression:", simplified.text());
        
        // 分数形式で結果を取得
        const result = simplified.text('fractions');
        console.log("Final result:", result);
        
        return result;
      } catch (nestedError) {
        console.error("Error in nested fraction calculation:", nestedError);
        
        // 入れ子になった分数式の計算に失敗した場合、手動で計算を試みる
        try {
          // 式を手動で展開して単純化
          // 例: (a+b)/(c+d) → (a+b)*(1/(c+d)) → a/(c+d) + b/(c+d)
          const manualResult = nerdamerInstance(exprStr).expand().text('fractions');
          console.log("Manual expansion result:", manualResult);
          return manualResult;
        } catch (manualError) {
          console.error("Error in manual calculation:", manualError);
          // 手動計算にも失敗した場合は元の式を返す
          return exprStr;
        }
      }
    }
    
    // 通常の代数的計算
    const nerdamerExpr = nerdamerInstance(exprStr);
    
    // 式を展開
    const expanded = nerdamerExpr.expand();
    console.log("Expanded expression:", expanded.text());
    
    // 式を単純化
    const simplified = expanded.simplify();
    console.log("Simplified expression:", simplified.text());
    
    // 分数形式で結果を取得
    const result = simplified.text('fractions');
    console.log("Final result:", result);
    
    return result;
  } catch (e) {
    console.error("Error in algebraic calculation:", e);
    
    // nerdamerでの計算に失敗した場合、math.jsを試す
    try {
      const mathResult = math.simplify(exprStr).toString();
      console.log("Math.js simplification result:", mathResult);
      return mathResult;
    } catch (mathError) {
      console.error("Math.js simplification error:", mathError);
      return exprStr; // すべての計算に失敗した場合は元の式を返す
    }
  }
}

/**
 * nerdamerが利用可能かどうかをチェックする関数
 * @returns {boolean} - nerdamerが利用可能な場合はtrue
 */
function isNerdamerAvailable() {
  // グローバルスコープとwindowオブジェクトの両方をチェック
  const globalAvailable = typeof nerdamer !== 'undefined';
  const windowAvailable = typeof window.nerdamer !== 'undefined';
  const available = globalAvailable || windowAvailable;
  
  console.log(`Nerdamer availability check: ${available ? 'Available' : 'Not available'}`);
  console.log(`- Global scope: ${globalAvailable ? 'Available' : 'Not available'}`);
  console.log(`- Window object: ${windowAvailable ? 'Available' : 'Not available'}`);
  
  return available;
}

// nerdamerを取得する関数（グローバルスコープまたはwindowオブジェクトから）
function getNerdamer() {
  if (typeof nerdamer !== 'undefined') {
    return nerdamer;
  } else if (typeof window.nerdamer !== 'undefined') {
    return window.nerdamer;
  }
  console.error("Nerdamer is not available");
  return null;
}

// 初期化時にnerdamerの可用性をチェック
console.log("Checking nerdamer availability on script load...");
setTimeout(() => {
  console.log(`Nerdamer is ${isNerdamerAvailable() ? 'available' : 'not available'} after timeout`);
}, 500);

/**
 * 抽象構文木を評価してLaTeX形式に変換する関数
 * @param {Object} ast - 抽象構文木
 * @returns {Object} - 計算エンジンと結果のLaTeX表現
 */
function evaluateExpressionToLatex(ast) {
  try {
    // ASTを文字列に変換
    const exprStr = astToString(ast);
    console.log("Expression string:", exprStr);
    
    // 変数を含むかチェック
    const hasVariables = containsSymbols(ast);
    
    // 数式に文字が含まれる場合はnerdamerを使用（利用可能な場合）
    if (hasVariables && isNerdamerAvailable()) {
      console.log("Expression contains variables, using nerdamer");
      
      try {
        // nerdamerインスタンスを取得
        const nerdamerInstance = getNerdamer();
        if (!nerdamerInstance) {
          throw new Error("Nerdamer is not available");
        }
        
        // nerdamerを使用して代数的計算を実行
        const nerdamerExpr = nerdamerInstance(exprStr);
        
        // 式を展開
        const expanded = nerdamerExpr.expand();
        console.log("Expanded expression:", expanded.text());
        
        // 式を単純化
        const simplified = expanded.simplify();
        console.log("Simplified expression:", simplified.text());
        
        // 分数形式で結果を取得
        const result = simplified.text('fractions');
        console.log("Final nerdamer result:", result);
        
        // 結果をLaTeX形式に変換
        let latex;
        try {
          // nerdamerでLaTeX形式に変換
          latex = nerdamerInstance(result).toTeX();
        } catch (latexError) {
          console.error("Error converting to LaTeX with nerdamer:", latexError);
          // 変換に失敗した場合はmath.jsを使用
          latex = math.parse(result).toTex({ 
            parenthesis: 'keep', 
            implicit: 'show' 
          });
        }
        
        return { engine: 'nerdamer', latex: `\\displaystyle ${latex}` };
      } catch (nerdamerError) {
        console.error("Nerdamer calculation error:", nerdamerError);
        
        // nerdamerでの計算に失敗した場合はmath.jsを試す
        try {
          const simplified = math.simplify(exprStr).toString();
          console.log("Simplified with math.js:", simplified);
          
          // 単純化された式をLaTeX形式に変換
          const latex = math.parse(simplified).toTex({ 
            parenthesis: 'keep', 
            implicit: 'show' 
          });
          
          return { engine: 'math.js', latex: `\\displaystyle ${latex}` };
        } catch (mathSimplifyError) {
          console.error("Math.js simplify error:", mathSimplifyError);
          
          // 単純化に失敗した場合は元の式をLaTeX形式に変換
          const latex = math.parse(exprStr).toTex({ 
            parenthesis: 'keep', 
            implicit: 'show' 
          });
          
          return { engine: 'math.js', latex: `\\displaystyle ${latex}` };
        }
      }
    } else {
      // 数字のみの場合はmath.jsを使用
      console.log("Expression contains only numbers, using math.js");
      
      // math.jsで計算を実行
      const result = math.evaluate(exprStr);
      console.log("Math.js calculation result:", result);
      
      // 結果をLaTeX形式に変換
      let latex;
      
      if (typeof result === 'number') {
        // 数値結果の場合
        latex = result.toString();
        
        // 小数点以下が長い場合は丸める
        if (latex.includes('.') && latex.length > 10) {
          const rounded = math.round(result, 6);
          latex = rounded.toString();
        }
      } else if (math.typeof(result) === 'Matrix') {
        // 行列結果の場合
        latex = '\\begin{pmatrix}';
        
        // 行列の各行を処理
        const size = result.size();
        for (let i = 0; i < size[0]; i++) {
          const row = [];
          for (let j = 0; j < size[1]; j++) {
            row.push(result.get([i, j]));
          }
          latex += row.join(' & ');
          
          if (i < size[0] - 1) {
            latex += ' \\\\';
          }
        }
        
        latex += '\\end{pmatrix}';
      } else {
        // その他の型の結果の場合
        latex = math.parse(result.toString()).toTex({ 
          parenthesis: 'keep', 
          implicit: 'show' 
        });
      }
      
      return { engine: 'math.js', latex: `\\displaystyle ${latex}` };
    }
  } catch (e) {
    console.error("Calculation error:", e);
    return { engine: 'math.js', latex: 'エラー: ' + e.message };
  }
}
