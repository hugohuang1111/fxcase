
import { _decorator, Component, Node, ForwardStage, renderer, getPhaseID, gfx, pipeline, ForwardPipeline, ForwardFlow, CCLoader, find, Sprite, Size, UITransform, Material } from 'cc';
const { ccclass, property } = _decorator;

const _samplerInfo = [
    gfx.Filter.LINEAR,
    gfx.Filter.LINEAR,
    gfx.Filter.NONE,
    gfx.Address.CLAMP,
    gfx.Address.CLAMP,
    gfx.Address.CLAMP,
];

const samplerHash = renderer.genSamplerHash(_samplerInfo);

class BloomRenderData {
    gbufferFrameBuffer: gfx.Framebuffer | null = null;
    gbufferRenderTargets: gfx.Texture[] = [];
    depthTex: gfx.Texture | null = null;
}

@ccclass('BloomMergeStage')
export class BloomMergeStage extends ForwardStage {

    private _bloomMat: Material|null = null;
    private _device: gfx.Device|null = null;
    private _bloomRenderData: BloomRenderData|null = null;
    private _testNode: Node | null = null;

    constructor() {
        super();
        this._name = "BloomMergeStage";
        this._phaseID = getPhaseID('bloom');
    }

    get bloomMat() {
        return this._bloomMat;
    }
    set bloomMat(val) {
        this._bloomMat = val;
    }

    public activate (pipeline: ForwardPipeline, flow: ForwardFlow) {
        super.activate(pipeline, flow);
    }

    public render (camera: renderer.scene.Camera): void {
        super.render(camera);
    }

    private apply2TestSprite(fb: gfx.Framebuffer): void {
        if (null == this._testNode) {
            this._testNode = find("Canvas/bloomfb");
        }
        if (null == this._testNode) {
            return;
        }
        const sprite = this._testNode.getComponent(Sprite);
        if (null == sprite) { return; }
        if (null == sprite.spriteFrame) { return; }
        if (null != fb.colorTextures && fb.colorTextures.length > 0) {
            sprite.spriteFrame.texture = fb.colorTextures[0];
        }
        sprite.material?.setProperty('TestTexture',renderTarget);
        // const ui = sprite.getComponent(UITransform);
        // let size=new Size(this._renderArea.width, this._renderArea.height);
        // size.width=size.width/cc.view.getScaleX();
        // size.height=size.height/cc.view.getScaleY();
        // ui?.setContentSize(size);
    }

    

}

