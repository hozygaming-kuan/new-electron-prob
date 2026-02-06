
import { GlobalContext, IStatModule } from '../types';

export class ScatterStatModule implements IStatModule {
  name = 'scatter';
  private data: any = {}; 
  private define: any;
  init(define: any) {this.define = define;}

  onSpin(_bet: number, _totalWin: number, _rawResult: any, _lineCount: number) {}

  merge(_otherData: any) {

  }

  getData() {  }

  getResult(_rate: number = 1, _targetRTP: number = 0.965, globalContext: GlobalContext) {
    return {
     
    };
  }
}
