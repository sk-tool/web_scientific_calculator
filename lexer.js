/**
 * 状態遷移ベースの字句解析器
 * 複雑な数式にも対応できるように設計されています
 */

// トークンタイプの定義
const TokenType = {
  // 数値
  NUMBER: 'Number',
  
  // 識別子（変数名、定数名）
  IDENTIFIER: 'Identifier',
  
  // コマンド（LaTeX関数など）
  COMMAND: 'Command',
  
  // 演算子
  PLUS: 'Plus',
  MINUS: 'Minus',
  MULTIPLY: 'Multiply',
  DIVIDE: 'Divide',
  POWER: 'Power',
  EQUALS: 'Equals',
  
  // 括弧
  LPAREN: 'LParen',
  RPAREN: 'RParen',
  LBRACKET: 'LBracket',
  RBRACKET: 'RBracket',
  LBRACE: 'LBrace',
  RBRACE: 'RBrace',
  
  // 区切り記号
  COMMA: 'Comma',
  SEMICOLON: 'Semicolon',
  DOT: 'Dot',
  
  // 比較演算子
  LESS_THAN: 'LessThan',
  GREATER_THAN: 'GreaterThan',
  LESS_EQUAL: 'LessEqual',
  GREATER_EQUAL: 'GreaterEqual',
  NOT_EQUAL: 'NotEqual',
  
  // その他
  UNKNOWN: 'Unknown',
  EOF: 'EOF'
};

// 字句解析器の状態
const LexerState = {
  INITIAL: 'INITIAL',
  NUMBER: 'NUMBER',
  IDENTIFIER: 'IDENTIFIER',
  COMMAND: 'COMMAND',
  OPERATOR: 'OPERATOR'
};

/**
 * 字句解析器クラス
 */
class Lexer {
  constructor(input) {
    this.input = input;
    this.position = 0;
    this.currentChar = this.input.length > 0 ? this.input[0] : null;
    this.state = LexerState.INITIAL;
    this.tokens = [];
    this.line = 1;
    this.column = 1;
  }

  /**
   * 次の文字に進む
   */
  advance() {
    this.position++;
    this.column++;
    
    if (this.position >= this.input.length) {
      this.currentChar = null;
    } else {
      this.currentChar = this.input[this.position];
      
      // 改行文字の処理
      if (this.currentChar === '\n') {
        this.line++;
        this.column = 1;
      }
    }
  }

  /**
   * 先読みして次の文字を返す（位置は進めない）
   */
  peek(offset = 1) {
    const peekPos = this.position + offset;
    if (peekPos >= this.input.length) {
      return null;
    }
    return this.input[peekPos];
  }

  /**
   * 空白文字をスキップ
   */
  skipWhitespace() {
    while (
      this.currentChar !== null && 
      /\s/.test(this.currentChar)
    ) {
      this.advance();
    }
  }

  /**
   * 数値トークンを処理
   * 整数と小数点に対応
   */
  processNumber() {
    let result = '';
    let hasDot = false;
    
    // 数字または小数点を読み込む
    while (
      this.currentChar !== null && 
      (/[0-9]/.test(this.currentChar) || 
       (this.currentChar === '.' && !hasDot))
    ) {
      if (this.currentChar === '.') {
        hasDot = true;
      }
      result += this.currentChar;
      this.advance();
    }
    
    return { type: TokenType.NUMBER, value: result };
  }

  /**
   * 識別子トークンを処理
   * 変数名、定数名（π, e など）に対応
   */
  processIdentifier() {
    let result = '';
    
    // 文字、数字、特殊文字を読み込む
    while (
      this.currentChar !== null && 
      /[a-zA-Zπ0-9_]/.test(this.currentChar)
    ) {
      result += this.currentChar;
      this.advance();
    }
    
    return { type: TokenType.IDENTIFIER, value: result };
  }

  /**
   * コマンドトークンを処理
   * LaTeX関数（\sin, \cos など）に対応
   */
  processCommand() {
    let result = '\\';
    this.advance(); // バックスラッシュをスキップ
    
    // コマンド名を読み込む
    while (
      this.currentChar !== null && 
      /[a-zA-Z]/.test(this.currentChar)
    ) {
      result += this.currentChar;
      this.advance();
    }
    
    return { type: TokenType.COMMAND, value: result };
  }

  /**
   * 演算子トークンを処理
   * 単一文字および複合演算子に対応
   */
  processOperator() {
    // 複合演算子の処理
    if (this.currentChar === '<' && this.peek() === '=') {
      this.advance();
      this.advance();
      return { type: TokenType.LESS_EQUAL, value: '<=' };
    }
    
    if (this.currentChar === '>' && this.peek() === '=') {
      this.advance();
      this.advance();
      return { type: TokenType.GREATER_EQUAL, value: '>=' };
    }
    
    if (this.currentChar === '!' && this.peek() === '=') {
      this.advance();
      this.advance();
      return { type: TokenType.NOT_EQUAL, value: '!=' };
    }
    
    // 単一文字演算子の処理
    const operatorMap = {
      '+': TokenType.PLUS,
      '-': TokenType.MINUS,
      '*': TokenType.MULTIPLY,
      '/': TokenType.DIVIDE,
      '^': TokenType.POWER,
      '=': TokenType.EQUALS,
      '(': TokenType.LPAREN,
      ')': TokenType.RPAREN,
      '[': TokenType.LBRACKET,
      ']': TokenType.RBRACKET,
      '{': TokenType.LBRACE,
      '}': TokenType.RBRACE,
      ',': TokenType.COMMA,
      ';': TokenType.SEMICOLON,
      '.': TokenType.DOT,
      '<': TokenType.LESS_THAN,
      '>': TokenType.GREATER_THAN
    };
    
    if (this.currentChar in operatorMap) {
      const type = operatorMap[this.currentChar];
      const value = this.currentChar;
      this.advance();
      return { type, value };
    }
    
    // 未知の文字
    const value = this.currentChar;
    this.advance();
    return { type: TokenType.UNKNOWN, value };
  }

  /**
   * 次のトークンを取得
   */
  getNextToken() {
    // 入力の終わりに達した場合
    if (this.currentChar === null) {
      return { type: TokenType.EOF, value: '' };
    }
    
    // 空白文字をスキップ
    if (/\s/.test(this.currentChar)) {
      this.skipWhitespace();
      return this.getNextToken();
    }
    
    // 数値の処理
    if (/[0-9]/.test(this.currentChar) || 
        (this.currentChar === '.' && /[0-9]/.test(this.peek()))) {
      return this.processNumber();
    }
    
    // 識別子の処理
    if (/[a-zA-Zπ_]/.test(this.currentChar)) {
      return this.processIdentifier();
    }
    
    // コマンドの処理
    if (this.currentChar === '\\') {
      return this.processCommand();
    }
    
    // その他の演算子や記号の処理
    return this.processOperator();
  }

  /**
   * 字句解析を実行し、トークン列を返す
   */
  tokenize() {
    let token = this.getNextToken();
    
    while (token.type !== TokenType.EOF) {
      this.tokens.push(token);
      token = this.getNextToken();
    }
    
    return this.tokens;
  }
}

/**
 * 入力文字列を解析してトークン列を返す
 * @param {string} input - 解析する入力文字列
 * @returns {Array} - トークンの配列
 */
function lex(input) {
  const lexer = new Lexer(input);
  console.log(lexer);
  return lexer.tokenize();
}
