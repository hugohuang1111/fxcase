
import { _decorator, Component, Node, ForwardStage, renderer, getPhaseID, gfx, pipeline, ForwardPipeline, ForwardFlow, CCLoader, find, Sprite, Size, UITransform, Material, RenderStage, PipelineStateManager } from 'cc';
import { Bloom } from './Bloom';
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

@ccclass('BloomBaseStage')
export class BloomBaseStage extends RenderStage {

    private _bloomMat: Material|null = null;
    private _bloom: Bloom | null = null;
    private _framebuffer: gfx.Framebuffer | null = null;
    private _descriptorSet: gfx.DescriptorSet | null = null;

    constructor() {
        super();
        this._name = "BloomBaseStage";
    }

    get bloomMat() {
        return this._bloomMat;
    }
    set bloomMat(val) {
        this._bloomMat = val;
    }

    get bloom() {
        return this._bloom;
    }
    set bloom(val) {
        this._bloom = val;
    }

    get framebuffer() {
        return this._framebuffer;
    }
    set framebuffer(val) {
        this._framebuffer = val;
    }

    get descriptorSet() {
        return this._descriptorSet;
    }
    set descriptorSet(val) {
        this._descriptorSet = val;
    }

    public activate (pl: ForwardPipeline, flow: ForwardFlow) {
        super.activate(pl, flow);
        const device = pl.device;

        const layoutInfo = new gfx.DescriptorSetLayoutInfo(pipeline.localDescriptorSetLayout.bindings);
        const layout = device.createDescriptorSetLayout(layoutInfo);
        const descSetInfo = new gfx.DescriptorSetInfo(layout);
        this._descriptorSet = device.createDescriptorSet(descSetInfo);
    }

    public render (camera: renderer.scene.Camera): void {
        const pl = this._pipeline;
        const device = pl.device;
        const cmdBuff = pl.commandBuffers[0];
        const fb = this.framebuffer ? this.framebuffer : camera.window?.framebuffer;
        if (null == fb) return;
        const rp = fb.renderPass;

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

        if (this._descriptorSet) {
            const dynamicOffsets: number[] = [0];
            cmdBuff.bindDescriptorSet(pipeline.SetIndex.LOCAL, this._descriptorSet, dynamicOffsets);
        }
        cmdBuff.bindDescriptorSet(pipeline.SetIndex.GLOBAL, pl.descriptorSet);

        cmdBuff.beginRenderPass(rp, fb, renderArea,
            colors, camera.clearDepth, camera.clearStencil);

        const pass = this.bloomMat!.passes[0];
        const shader = renderer.ShaderPool.get(this.bloomMat!.passes[0].getShaderVariant());

        const inputAssembler = camera.window!.hasOffScreenAttachments ? this._bloom!.quadIAOffscreen : this._bloom!.quadIAOnscreen;
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
