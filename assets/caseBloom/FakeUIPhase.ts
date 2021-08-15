
import { _decorator, Component, Node, RenderPipeline, Camera, gfx } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('FakeUIPhase')
export class FakeUIPhase {

    public activate (pipeline: RenderPipeline) {
    }

    public render (camera: Camera, renderPass: gfx.RenderPass) {
    }

}

