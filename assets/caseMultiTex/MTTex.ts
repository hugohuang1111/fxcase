
import { _decorator, Component, Node, director } from 'cc';
import { MTBatcher2D } from './MTBatcher2D';
const { ccclass, property } = _decorator;
 
@ccclass('MTTex')
export class MTTex extends Component {

    start () {
        if (director.root) {
            MTBatcher2D .getInstance().hackBatch2d(director.root.batcher2D);
        }
    }

    loadTextureBindings() {
        if (null == this.customMaterial) {
            return;
        }
        const pass = this.customMaterial?.passes[0];
        const mtTexBindingMap = new Map<string, number>();
        for (let i = 1; i < 8; i++) {
            const name = 'spriteTexture' + i;
            const binding = pass.getBinding(name);
            if (binding >= 0) {
                mtTexBindingMap.set(name, binding);
            }
        }
        MTBatcher2D.getInstance().setTexturesBindingMap(mtTexBindingMap);
    }

}
