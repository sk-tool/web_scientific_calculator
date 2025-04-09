//構文解析
/**
 * 構文解析器
 * 字句解析器から受け取ったトークン列を解析して抽象構文木(AST)を生成します
 */

// 抽象構文木のノードタイプ
const ASTNodeType = {
  PROGRAM: 'Program',
  NUMBER_LITERAL: 'NumberLiteral',
  IDENTIFIER: 'Identifier',
  BINARY_EXPRESSION: 'BinaryExpression',
  UNARY_EXPRESSION: 'UnaryExpression',
  FUNCTION_CALL: 'FunctionCall',
  ARRAY_EXPRESSION: 'ArrayExpression',
  MATRIX_EXPRESSION: 'MatrixExpression',
  COMPARISON_EXPRESSION: 'ComparisonExpression',
  ASSIGNMENT_EXPRESSION: 'AssignmentExpression',
  PARENTHESIZED_EXPRESSION: 'ParenthesizedExpression'
};

/**
 * 構文解析器クラス
 */
class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.position = 0;
    this.errors = [];
  }

  /**
   * 現在のトークンを取得（位置は進めない）
   */
  peek(offset = 0) {
    const pos = this.position + offset;
    if (pos >= this.tokens.length) {
      return null;
    }
    return this.tokens[pos];
  }

  /**
   * 現在のトークンを消費して次に進む
   */
  consume(expectedType) {
    const token = this.peek();
    
    if (!token) {
      this.addError(`予期せぬ入力の終わりです。${expectedType}が必要です。`);
      return null;
    }
    
    if (expectedType && token.type !== expectedType) {
      this.addError(`${expectedType}が必要ですが、${token.type}が見つかりました。`);
      return null;
    }
    
    this.position++;
    return token;
  }

  /**
   * エラーを追加
   */
  addError(message) {
    const token = this.peek();
    let errorMsg = message;
    
    if (token) {
      errorMsg += ` トークン: ${token.value} (${token.type})`;
    }
    
    this.errors.push(errorMsg);
  }

  /**
   * 構文解析を実行
   */
  parse() {
    try {
      const result = this.parseExpression();
      
      // 解析後にまだトークンが残っている場合
      if (this.position < this.tokens.length) {
        const remaining = this.tokens.slice(this.position);
        this.addError(`解析が完了しましたが、未処理のトークンが残っています: ${remaining.map(t => t.value).join(' ')}`);
      }
      
      // エラーがある場合は例外をスロー
      if (this.errors.length > 0) {
        throw new Error(this.errors.join('\n'));
      }
      
      return result;
    } catch (e) {
      if (this.errors.length > 0) {
        throw new Error(this.errors.join('\n'));
      }
      throw e;
    }
  }

  /**
   * 基本式の解析
   * 数値、識別子、関数呼び出し、括弧で囲まれた式など
   */
  parsePrimary() {
    const token = this.peek();
    
    if (!token) {
      this.addError('予期せぬ入力の終わりです。式が必要です。');
      return null;
    }
    
    // 数値リテラル
    if (token.type === 'Number') {
      this.consume();
      return { type: ASTNodeType.NUMBER_LITERAL, value: token.value };
    }
    
    // 識別子（変数、定数）
    if (token.type === 'Identifier') {
      this.consume();
      return { type: ASTNodeType.IDENTIFIER, value: token.value };
    }
    
    // 関数呼び出し
    if (token.type === 'Command') {
      const funcName = token.value;
      this.consume();
      
      // \frac コマンドの特別処理
      if (funcName === '\\frac') {
        return this.parseFracCommand();
      }
      
      // 引数リストの解析
      let args = [];
      
      // 中括弧で囲まれた引数の処理
      if (this.peek()?.type === 'LBrace') {
        this.consume('LBrace');
        args.push(this.parseExpression());
        this.consume('RBrace');
        
        // 追加の引数があれば処理
        while (this.peek()?.type === 'LBrace') {
          this.consume('LBrace');
          args.push(this.parseExpression());
          this.consume('RBrace');
        }
      }
      // 括弧があれば引数として解析
      else if (this.peek()?.type === 'LParen') {
        this.consume('LParen');
        
        // 引数がある場合
        if (this.peek()?.type !== 'RParen') {
          args.push(this.parseExpression());
          
          // カンマ区切りの引数リスト
          while (this.peek()?.type === 'Comma') {
            this.consume('Comma');
            args.push(this.parseExpression());
          }
        }
        
        this.consume('RParen');
      } else {
        // 括弧がない場合は次の式を引数として扱う
        args.push(this.parsePrimary());
      }
      
      return { 
        type: ASTNodeType.FUNCTION_CALL, 
        name: funcName, 
        arguments: args 
      };
    }
    
    // 括弧で囲まれた式
    if (token.type === 'LParen') {
      this.consume('LParen');
      const expr = this.parseExpression();
      this.consume('RParen');
      return {
        type: ASTNodeType.PARENTHESIZED_EXPRESSION,
        expression: expr
      };
    }
    
    // 角括弧で囲まれた配列
    if (token.type === 'LBracket') {
      return this.parseArrayExpression();
    }
    
    // 中括弧で囲まれた行列
    if (token.type === 'LBrace') {
      return this.parseMatrixExpression();
    }
    
    // 単項演算子
    if (token.type === 'Plus' || token.type === 'Minus') {
      const operator = this.consume().value;
      const operand = this.parsePrimary();
      return {
        type: ASTNodeType.UNARY_EXPRESSION,
        operator,
        operand
      };
    }
    
    this.addError(`予期せぬトークンです: ${token.type}`);
    this.consume(); // エラー回復のため次に進む
    return null;
  }

  /**
   * 配列式の解析
   * [1, 2, 3] のような形式
   */
  parseArrayExpression() {
    this.consume('LBracket');
    const elements = [];
    
    // 空の配列
    if (this.peek()?.type === 'RBracket') {
      this.consume('RBracket');
      return { type: ASTNodeType.ARRAY_EXPRESSION, elements };
    }
    
    // 最初の要素
    elements.push(this.parseExpression());
    
    // カンマ区切りの要素リスト
    while (this.peek()?.type === 'Comma') {
      this.consume('Comma');
      elements.push(this.parseExpression());
    }
    
    this.consume('RBracket');
    return { type: ASTNodeType.ARRAY_EXPRESSION, elements };
  }

  /**
   * \frac コマンドの解析
   * \frac{分子}{分母} の形式
   */
  parseFracCommand() {
    let numerator = null;
    let denominator = null;
    
    // 分子の解析
    if (this.peek()?.type === 'LBrace') {
      this.consume('LBrace');
      numerator = this.parseExpression();
      this.consume('RBrace');
    } else {
      this.addError('\\frac コマンドの分子が見つかりません。{式} の形式が必要です。');
      return null;
    }
    
    // 分母の解析
    if (this.peek()?.type === 'LBrace') {
      this.consume('LBrace');
      denominator = this.parseExpression();
      this.consume('RBrace');
    } else {
      this.addError('\\frac コマンドの分母が見つかりません。{式} の形式が必要です。');
      return null;
    }
    
    return {
      type: ASTNodeType.FUNCTION_CALL,
      name: '\\frac',
      arguments: [numerator, denominator]
    };
  }

  /**
   * 行列式の解析
   * {1, 2; 3, 4} のような形式
   */
  parseMatrixExpression() {
    this.consume('LBrace');
    const rows = [];
    let currentRow = [];
    
    // 空の行列
    if (this.peek()?.type === 'RBrace') {
      this.consume('RBrace');
      return { type: ASTNodeType.MATRIX_EXPRESSION, rows };
    }
    
    // 最初の要素
    currentRow.push(this.parseExpression());
    
    // 行と列の解析
    while (this.peek() && this.peek().type !== 'RBrace') {
      if (this.peek().type === 'Comma') {
        // 同じ行の次の要素
        this.consume('Comma');
        currentRow.push(this.parseExpression());
      } else if (this.peek().type === 'Semicolon') {
        // 次の行
        this.consume('Semicolon');
        rows.push(currentRow);
        currentRow = [];
        currentRow.push(this.parseExpression());
      } else {
        this.addError(`行列内で予期せぬトークンです: ${this.peek().type}`);
        this.consume(); // エラー回復のため次に進む
      }
    }
    
    // 最後の行を追加
    if (currentRow.length > 0) {
      rows.push(currentRow);
    }
    
    this.consume('RBrace');
    return { type: ASTNodeType.MATRIX_EXPRESSION, rows };
  }

  /**
   * 累乗演算子の解析
   */
  parseExponent() {
    let node = this.parsePrimary();
    
    while (this.peek()?.type === 'Power') {
      const operator = this.consume().value;
      const right = this.parsePrimary();
      node = { 
        type: ASTNodeType.BINARY_EXPRESSION, 
        operator, 
        left: node, 
        right 
      };
    }
    
    return node;
  }

  /**
   * 乗除算の解析
   */
  parseTerm() {
    let node = this.parseExponent();
    
    while (
      this.peek()?.type === 'Multiply' || 
      this.peek()?.type === 'Divide'
    ) {
      const operator = this.consume().value;
      const right = this.parseExponent();
      node = { 
        type: ASTNodeType.BINARY_EXPRESSION, 
        operator, 
        left: node, 
        right 
      };
    }
    
    return node;
  }

  /**
   * 加減算の解析
   */
  parseAdditive() {
    let node = this.parseTerm();
    
    while (
      this.peek()?.type === 'Plus' || 
      this.peek()?.type === 'Minus'
    ) {
      const operator = this.consume().value;
      const right = this.parseTerm();
      node = { 
        type: ASTNodeType.BINARY_EXPRESSION, 
        operator, 
        left: node, 
        right 
      };
    }
    
    return node;
  }

  /**
   * 比較演算子の解析
   */
  parseComparison() {
    let node = this.parseAdditive();
    
    while (
      this.peek()?.type === 'LessThan' || 
      this.peek()?.type === 'GreaterThan' ||
      this.peek()?.type === 'LessEqual' ||
      this.peek()?.type === 'GreaterEqual' ||
      this.peek()?.type === 'Equals' ||
      this.peek()?.type === 'NotEqual'
    ) {
      const operator = this.consume().value;
      const right = this.parseAdditive();
      node = { 
        type: ASTNodeType.COMPARISON_EXPRESSION, 
        operator, 
        left: node, 
        right 
      };
    }
    
    return node;
  }

  /**
   * 代入演算子の解析
   */
  parseAssignment() {
    let node = this.parseComparison();
    
    if (
      node.type === ASTNodeType.IDENTIFIER && 
      this.peek()?.type === 'Equals'
    ) {
      const operator = this.consume().value;
      const right = this.parseAssignment(); // 右結合性のため再帰的に解析
      node = { 
        type: ASTNodeType.ASSIGNMENT_EXPRESSION, 
        operator, 
        left: node, 
        right 
      };
    }
    
    return node;
  }

  /**
   * 式の解析
   * 最も優先度の低い演算子から開始
   */
  parseExpression() {
    return this.parseAssignment();
  }
}

/**
 * トークン列を解析して抽象構文木を生成
 * @param {Array} tokens - 字句解析器から得られたトークン列
 * @returns {Object} - 抽象構文木
 */
function parse(tokens) {
  const parser = new Parser(tokens);
  return parser.parse();
}
