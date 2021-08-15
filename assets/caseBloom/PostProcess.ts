
import { _decorator, Component, Node, gfx, pipeline, RenderStage, renderer } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('PostProcess')
export class PostProcess extends RenderStage {

    destroy() {
        throw new Error('Method not implemented.');
    }
    render(camera: renderer.scene.Camera) {
        throw new Error('Method not implemented.');
    }


}

