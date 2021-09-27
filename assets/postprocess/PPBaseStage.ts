
import { _decorator, renderer, gfx, pipeline, ForwardPipeline, ForwardFlow, Material, RenderStage, PipelineStateManager, Camera } from 'cc';
const { ccclass } = _decorator;

const colors: gfx.Color[] = [new gfx.Color(0, 0, 0, 1)];

const _samplerInfo = [
    gfx.Filter.LINEAR,
    gfx.Filter.LINEAR,
    gfx.Filter.NONE,
    gfx.Address.CLAMP,
    gfx.Address.CLAMP,
    gfx.Address.CLAMP,
];


@ccclass('PPBaseStage')
export class PPBaseStage extends RenderStage {

    private _mat: Material | null = null;
    private _ia:  gfx.InputAssembler | null = null;
    private _framebuffer: gfx.Framebuffer | null = null;

    constructor() {
        super();
        this._name = "PPBaseStage";
    }

    get mat() {
        return this._mat;
    }
    set mat(val) {
        this._mat = val;
    }

    get ia() {
        return this._ia;
    }
    set ia(val) {
        this._ia = val;
    }

    get framebuffer() {
        return this._framebuffer;
    }
    set framebuffer(val) {
        this._framebuffer = val;
    }

    public render (camera: renderer.scene.Camera): void {
        if (camera.projectionType != Camera.ProjectionType.PERSPECTIVE) { return; }
        if (null == this._mat) { return; }
        if (null == this._ia) { return; }

        const pl = this._pipeline;
        const device = pl.device;
        const cmdBuff = pl.commandBuffers[0];
        let fb = this.framebuffer ? this.framebuffer : camera.window?.framebuffer;
        if (null == fb) { return; }
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

        cmdBuff.beginRenderPass(rp, fb, renderArea, colors, camera.clearDepth, camera.clearStencil);
        cmdBuff.bindDescriptorSet(pipeline.SetIndex.GLOBAL, pl.descriptorSet);

        const pass = this._mat!.passes[0];
        const shader = this._mat!.passes[0].getShaderVariant();

        let inputAssembler = this._ia;
        let pso: gfx.PipelineState | null = null;
        if (pass != null && shader != null && inputAssembler != null) {
            pso = PipelineStateManager.getOrCreatePipelineState(device, pass, shader, rp, inputAssembler);
        }

        if (pso != null) {
            cmdBuff.bindPipelineState(pso);
            cmdBuff.bindDescriptorSet(pipeline.SetIndex.MATERIAL, pass.descriptorSet);
            cmdBuff.bindInputAssembler(inputAssembler);
            cmdBuff.draw(inputAssembler);
        }

        cmdBuff.endRenderPass();
    }

    destroy() {
    }

}
