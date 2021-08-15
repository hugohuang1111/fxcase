
import { _decorator, Component, Node, ForwardStage, renderer, getPhaseID, gfx, pipeline, ForwardPipeline, ForwardFlow, CCLoader, find, Sprite, Size, UITransform, Material, RenderStage, PipelineStateManager } from 'cc';
import { BloomRenderQueue, bloomRenderQueueClearFunc, opaqueCompareFn, transparentCompareFn } from './BloomRenderQueue';
const { ccclass, property } = _decorator;

const colors: gfx.Color[] = [new gfx.Color(0, 0, 0, 1)];

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

@ccclass('BloomThresholdStage')
export class BloomThresholdStage extends RenderStage {

    
    private _bloomMat: Material|null = null;
    private _bloomData: BloomRenderData | null = null;
    private _renderQueues: BloomRenderQueue[] = [];

    private _device: gfx.Device|null = null;
    private _bloomRenderData: BloomRenderData|null = null;
    private _testNode: Node | null = null;

    private _phaseIDDefault = getPhaseID('default');
    private _phaseID = getPhaseID('bloom-threshold');

    constructor() {
        super();
        this._name = "BloomThresholdStage";
    }

    get bloomMat() {
        return this._bloomMat;
    }
    set bloomMat(val) {
        this._bloomMat = val;
    }

    get bloomData() {
        return this._bloomData;
    }
    set bloomData(val) {
        this._bloomData = val;
    }

    public activate (pl: ForwardPipeline, flow: ForwardFlow) {
        super.activate(pl, flow);
        const device = pl.device;
    }

    public render (camera: renderer.scene.Camera): void {
        const pl = this._pipeline;
        const device = pl.device;
        const cmdBuff = pl.commandBuffers[0];
        const bloomData = this._bloomData;
        if (null == bloomData) return;
        const fb = bloomData?.gbufferFrameBuffer
        if (null == fb) return;
        const rp = fb.renderPass;

        this._renderQueues.forEach(bloomRenderQueueClearFunc);

        pl.pipelineUBO.updateCameraUBO(camera);

        const renderArea = new gfx.Rect(0, 0, 1, 1);
        const vp = camera.viewport;
        renderArea.x = vp.x * camera.width;
        renderArea.y = vp.y * camera.height;
        renderArea.width = vp.width * camera.width * pl.pipelineSceneData.shadingScale;
        renderArea.height = vp.height * camera.height * pl.pipelineSceneData.shadingScale;

        if (camera.clearFlag & gfx.ClearFlagBit.COLOR) {
            colors[0].x = camera.clearColor.x;
            colors[0].y = camera.clearColor.y;
            colors[0].z = camera.clearColor.z;
        }
        colors[0].w = camera.clearColor.w;

        // cmdBuff.bindDescriptorSet(pipeline.SetIndex.LOCAL, this._descriptorSet, dynamicOffsets);
        cmdBuff.bindDescriptorSet(pipeline.SetIndex.GLOBAL, pl.descriptorSet);

        cmdBuff.beginRenderPass(rp, fb, renderArea,
        colors, camera.clearDepth, camera.clearStencil);

        const pass = this.bloomMat!.passes[0];
        const shader = renderer.ShaderPool.get(this.bloomMat!.passes[0].getShaderVariant());

        const inputAssembler = camera.window!.hasOffScreenAttachments ? pl.quadIAOffscreen : pl.quadIAOnscreen;
        let pso: gfx.PipelineState | null = null;
        if (pass != null && shader != null && inputAssembler != null) {
            pso = PipelineStateManager.getOrCreatePipelineState(device, pass, shader, rp, inputAssembler);
        }

        const renderObjects = pl.pipelineSceneData.renderObjects;
        if (pso != null && renderObjects.length > 0) {
            cmdBuff.bindPipelineState(pso);
            cmdBuff.bindInputAssembler(inputAssembler);
            cmdBuff.draw(inputAssembler);
        }

        cmdBuff.endRenderPass();
    }

    destroy() {
    }


}

