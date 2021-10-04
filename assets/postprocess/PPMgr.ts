
import { _decorator, Component, Director, ForwardFlow, ForwardStage, pipeline, ForwardPipeline, renderer, RenderPipeline, gfx, Material, CCString } from 'cc';
import { PPBaseStage } from './PPBaseStage';
const { ccclass, property } = _decorator;

export class ShaderTexParams {
    name: string = "";

}

@ccclass('PPStageDesc')
export class PPStageDesc {
    @property(Material)
    mat:    Material | null = null;

    @property([CCString])
    inFBNames: string[] = [];

    @property()
    outFBName: string = "";

}

const _samplerInfo = [
    gfx.Filter.LINEAR,
    gfx.Filter.LINEAR,
    gfx.Filter.NONE,
    gfx.Address.CLAMP,
    gfx.Address.CLAMP,
    gfx.Address.CLAMP,
];

const samplerHash = renderer.genSamplerHash(_samplerInfo);

@ccclass('PPMgr')
export class PPMgr extends Component {

    @property([PPStageDesc])
    stageDescs: PPStageDesc[] = [];

    private fbMap: Map<string, gfx.Framebuffer> = new Map();

    private _quadIA: gfx.InputAssembler | null = null;

    start () {
        this.generatePipelineRenderData();
        this.addPostProcessStage();
    }

    generatePipelineRenderData() {
        const pl = Director.instance.root?.pipeline;
        if (null == pl) {
            return;
        }
        this.generateIA(pl.device);
        this.generateFrameBuffers(pl);
    }

    addPostProcessStage() {
        const pl = Director.instance.root?.pipeline;
        if (null == pl) {
            return;
        }
        if (!(pl instanceof ForwardPipeline)) {
            return;
        }
        if (0 == this.stageDescs.length) {
            return;
        }
        const device = pl.device;
        const fpl = pl as ForwardPipeline;
        let flows = pl.flows;
        if (null == flows) {
            console.log("ERROR! can't find pipeline flows");
            return;
        }
        const self = this;
        for (let flow of flows) {
            if (flow instanceof ForwardFlow) {
                const ff = flow as ForwardFlow;

                for (let stage of ff.stages) {
                    if (stage instanceof ForwardStage) {
                        const fstage = stage;
                        const originRender = fstage.render;

                        fstage.render = function(camera: renderer.scene.Camera) {
                            const originfb = camera.window?.framebuffer;
                            if (camera.window) {
                                camera.window._framebuffer = self.fbMap.get("screenTex");
                            }

                            originRender.call(fstage, camera);

                            camera.window._framebuffer = originfb;
                        }

                        break;
                    }
                }

                for (let i = 0; i < this.stageDescs.length; i++) {
                    const stageDesc = this.stageDescs[i];
                    const stage = new PPBaseStage();
                    stage.mat = stageDesc.mat;
                    stage.ia = this._quadIA;

                    const pass = stage.mat?.passes[0];
                    if (pass) {
                        stageDesc.inFBNames.forEach(inFBName => {
                            const binding = pass.getBinding(inFBName);
                            if (binding && binding > -1) {
                                const sampler = renderer.samplerLib.getSampler(device, samplerHash);
                                const fb = this.fbMap.get(inFBName);
                                if (fb) {
                                    pass.bindTexture(binding, fb.colorTextures[0]!);
                                    pass.bindSampler(binding, sampler);
                                }
                            }
                        });
                    }
                    if (stageDesc.outFBName) {
                        const fb = this.fbMap.get(stageDesc.outFBName);
                        if (fb) {
                            stage.framebuffer = fb;
                        }
                    }

                    // if (i == this.stageDescs.length - 1) {
                    //     stage.framebuffer = null;
                    // }
                    stage.activate(fpl, ff);
                    ff.stages.push(stage);
                    pass?.update();
                }

                break;
            }
        }
    }

    private bindingInputTexByName(pass: renderer.Pass) {

    }

    private generateIA(device: gfx.Device) {
        if (null != this._quadIA) { return; }

        const vbStride = Float32Array.BYTES_PER_ELEMENT * 4;
        const vbSize = vbStride * 4;
        const quadVB = device.createBuffer(new gfx.BufferInfo(
            gfx.BufferUsageBit.VERTEX | gfx.BufferUsageBit.TRANSFER_DST,
            gfx.MemoryUsageBit.HOST | gfx.MemoryUsageBit.DEVICE,
            vbSize,
            vbStride,
        ));
        const vbData = new Float32Array(4 * 4);
        let n = 0;
        vbData[n++] = -1.0; vbData[n++] = -1.0; vbData[n++] = 0; vbData[n++] = 0;
        vbData[n++] = 1.0; vbData[n++] = -1.0; vbData[n++] = 1; vbData[n++] = 0;
        vbData[n++] = -1.0; vbData[n++] = 1.0; vbData[n++] = 0; vbData[n++] = 1;
        vbData[n++] = 1.0; vbData[n++] = 1.0; vbData[n++] = 1; vbData[n++] = 1;
        quadVB.update(vbData);

        const ibStride = Uint8Array.BYTES_PER_ELEMENT;
        const ibSize = ibStride * 6;
        const quadIB = device.createBuffer(new gfx.BufferInfo(
            gfx.BufferUsageBit.INDEX | gfx.BufferUsageBit.TRANSFER_DST,
            gfx.MemoryUsageBit.HOST | gfx.MemoryUsageBit.DEVICE,
            ibSize,
            ibStride,
        ));
        const indices = new Uint8Array(6);
        indices[0] = 0; indices[1] = 1; indices[2] = 2;
        indices[3] = 1; indices[4] = 3; indices[5] = 2;
        quadIB.update(indices);

        const attributes = new Array<gfx.Attribute>(2);
        attributes[0] = new gfx.Attribute('a_position', gfx.Format.RG32F);
        attributes[1] = new gfx.Attribute('a_texCoord', gfx.Format.RG32F);

        const quadIA = device.createInputAssembler(new gfx.InputAssemblerInfo(
            attributes,
            [quadVB],
            quadIB,
        ));

        this._quadIA = quadIA;
    }

    private generateFrameBuffers (pl: RenderPipeline) {
        this.stageDescs.forEach(stageDesc => {
            stageDesc.inFBNames.forEach(fbName => {
                this.generateFrameBufferByName(pl, fbName);
            });
            if (stageDesc.outFBName) {
                this.generateFrameBufferByName(pl, stageDesc.outFBName);
            }
        });
    }

    private generateFrameBufferByName(pl : RenderPipeline, fbName: string) {
        if (this.fbMap.get(fbName)) {
            return;
        }
        const fb = this.generateFrameBuffer(pl);
        if (fb) {
            this.fbMap.set(fbName, fb);
        }
    }

    private generateFrameBuffer (pl: RenderPipeline): gfx.Framebuffer | null {
        const device = pl.device;
        if (null == device) {
            return null;
        }
        const width = device.width;
        const height = device.height;

        const colorAttachment0 = new gfx.ColorAttachment();
        colorAttachment0.format = gfx.Format.RGBA16F;
        colorAttachment0.loadOp = gfx.LoadOp.CLEAR;
        colorAttachment0.storeOp = gfx.StoreOp.STORE;
        const depthStencilAttachment = new gfx.DepthStencilAttachment();
        depthStencilAttachment.format = device.depthStencilFormat;
        depthStencilAttachment.depthLoadOp = gfx.LoadOp.CLEAR;
        depthStencilAttachment.depthStoreOp = gfx.StoreOp.STORE;
        depthStencilAttachment.stencilLoadOp = gfx.LoadOp.CLEAR;
        depthStencilAttachment.stencilStoreOp = gfx.StoreOp.STORE;
        const rPass = device.createRenderPass(new gfx.RenderPassInfo([colorAttachment0], depthStencilAttachment));

        const clrTexs : gfx.Texture[] = [];
        clrTexs.push(device.createTexture(new gfx.TextureInfo(
            gfx.TextureType.TEX2D,
            gfx.TextureUsageBit.COLOR_ATTACHMENT | gfx.TextureUsageBit.SAMPLED,
            gfx.Format.RGBA16F,
            width,
            height,
        )));

        const depthTex: gfx.Texture = device.createTexture(new gfx.TextureInfo(
            gfx.TextureType.TEX2D,
            gfx.TextureUsageBit.DEPTH_STENCIL_ATTACHMENT,
            device.depthStencilFormat,
            width,
            height,
        ));

        const fb: gfx.Framebuffer = device.createFramebuffer(new gfx.FramebufferInfo(
            rPass,
            clrTexs,
            depthTex,
        ));

        /*
        const descriptorSet = pl.descriptorSet;
        descriptorSet?.bindTexture(pipeline.UNIFORM_GBUFFER_ALBEDOMAP_BINDING, fb.colorTextures[0]!);

        const sampler = renderer.samplerLib.getSampler(device, samplerHash);
        descriptorSet?.bindSampler(pipeline.UNIFORM_GBUFFER_ALBEDOMAP_BINDING, sampler);

        descriptorSet?.update();
        */

        return fb;
    }

    protected destroyQuadInputAssembler () {
        if (this._quadIA) {
            let vbs = this._quadIA?.vertexBuffers;
            vbs.forEach(vb => {
                vb.destroy();
            });
            this._quadIA.indexBuffer?.destroy();
            this._quadIA.destroy();
            this._quadIA = null;
        }

    }

}

