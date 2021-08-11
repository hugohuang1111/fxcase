
import { _decorator, Component, Node, ForwardStage, renderer, getPhaseID, gfx, pipeline, ForwardPipeline, ForwardFlow } from 'cc';
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

@ccclass('BloomStage')
export class BloomStage extends ForwardStage {

    private _generated: boolean = false;
    private _device: gfx.Device|null = null;
    private _bloomRenderData: BloomRenderData|null = null;
    private _gbufferRenderPass: gfx.RenderPass | null = null;
    private _descriptorSet: gfx.DescriptorSet | null = null;

    constructor() {
        super();
        this._name = "BloomStage";
        this._phaseID = getPhaseID('bloom');
    }

    public get device(): gfx.Device|null {
        return this._device;
    }

    public set device(d: gfx.Device|null) {
        this._device = d;
    }

    public get descriptorSet(): gfx.DescriptorSet|null {
        return this._descriptorSet;
    }

    public set descriptorSet(d: gfx.DescriptorSet|null) {
        this._descriptorSet = d;
    }

    public activate (pipeline: ForwardPipeline, flow: ForwardFlow) {
        super.activate(pipeline, flow);
        if (!this._generated) {
            this.generateOffFrameBuffer();
            this._generated = true;
        }
    }

    public render (camera: renderer.scene.Camera): void {
        if (null == camera.window) { return; }
        if (null == this._bloomRenderData) { return; }
        if (null == this._bloomRenderData.gbufferFrameBuffer) { return; }

        console.log('bloom stage renderer');
        const originWin = camera.window;
        camera.window = {
            framebuffer: this._bloomRenderData.gbufferFrameBuffer
        }
        super.render(camera);
        camera.window = originWin;
    }

    private generateOffFrameBuffer () {
        const device = this.device;
        if (null == device) {
            return;
        }

        if (!this._gbufferRenderPass) {
            const colorAttachment0 = new gfx.ColorAttachment();
            colorAttachment0.format = gfx.Format.RGBA16F;
            colorAttachment0.loadOp = gfx.LoadOp.CLEAR; // should clear color attachment
            colorAttachment0.storeOp = gfx.StoreOp.STORE;

            const depthStencilAttachment = new gfx.DepthStencilAttachment();
            depthStencilAttachment.format = device.depthStencilFormat;
            depthStencilAttachment.depthLoadOp = gfx.LoadOp.CLEAR;
            depthStencilAttachment.depthStoreOp = gfx.StoreOp.STORE;
            depthStencilAttachment.stencilLoadOp = gfx.LoadOp.CLEAR;
            depthStencilAttachment.stencilStoreOp = gfx.StoreOp.STORE;
            const renderPassInfo = new gfx.RenderPassInfo([colorAttachment0],
                depthStencilAttachment);
            this._gbufferRenderPass = device.createRenderPass(renderPassInfo);
        }

        const width = device.width;
        const height = device.height;
        const data: BloomRenderData = this._bloomRenderData = new BloomRenderData();

        data.gbufferRenderTargets.push(device.createTexture(new gfx.TextureInfo(
            gfx.TextureType.TEX2D,
            gfx.TextureUsageBit.COLOR_ATTACHMENT | gfx.TextureUsageBit.SAMPLED,
            gfx.Format.RGBA16F,
            width,
            height,
        )));

        data.depthTex = device.createTexture(new gfx.TextureInfo(
            gfx.TextureType.TEX2D,
            gfx.TextureUsageBit.DEPTH_STENCIL_ATTACHMENT,
            device.depthStencilFormat,
            width,
            height,
        ));

        data.gbufferFrameBuffer = device.createFramebuffer(new gfx.FramebufferInfo(
            this._gbufferRenderPass!,
            data.gbufferRenderTargets,
            data.depthTex,
        ));

        this._descriptorSet?.bindTexture(pipeline.UNIFORM_GBUFFER_ALBEDOMAP_BINDING, data.gbufferFrameBuffer.colorTextures[0]!);

        const sampler = renderer.samplerLib.getSampler(device, samplerHash);
        this._descriptorSet?.bindSampler(pipeline.UNIFORM_GBUFFER_ALBEDOMAP_BINDING, sampler);
        this._descriptorSet?.bindSampler(pipeline.UNIFORM_GBUFFER_POSITIONMAP_BINDING, sampler);
        this._descriptorSet?.bindSampler(pipeline.UNIFORM_GBUFFER_NORMALMAP_BINDING, sampler);
        this._descriptorSet?.bindSampler(pipeline.UNIFORM_GBUFFER_EMISSIVEMAP_BINDING, sampler);
        this._descriptorSet?.bindSampler(pipeline.UNIFORM_LIGHTING_RESULTMAP_BINDING, sampler);
    }

}

