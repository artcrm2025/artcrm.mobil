declare module 'react-native-html-to-pdf' {
  interface RNHTMLtoPDFOptions {
    html: string;
    fileName?: string;
    directory?: string;
    base64?: boolean;
    height?: number;
    width?: number;
    padding?: number;
  }

  interface RNHTMLtoPDFResponse {
    filePath: string;
    base64?: string;
  }

  const RNHTMLtoPDF: {
    convert: (options: RNHTMLtoPDFOptions) => Promise<RNHTMLtoPDFResponse>;
  };

  export default RNHTMLtoPDF;
}

declare module 'react-native-print' {
  interface PrintOptions {
    jobName?: string;
    filePath?: string;
    html?: string;
    printerURL?: string;
  }

  const RNPrint: {
    print: (options: PrintOptions) => Promise<void>;
    selectPrinter: () => Promise<void>;
  };

  export default RNPrint;
}

declare module '*.png' {
  const value: any;
  export default value;
}

declare module '*.jpg' {
  const value: any;
  export default value;
}