
import { _decorator, Component, Node, Director, ForwardFlow, ForwardStage, pipeline, ForwardPipeline, Camera, renderer, RenderPipeline, gfx, Material } from 'cc';
import { BloomBaseStage } from './BloomBaseStage';
import { BloomBlurStage } from './BloomBlurStage';
import { BloomMergeStage } from './BloomMergeStage';
import { BloomThresholdStage } from './BloomThresholdStage';
import { FakeUIPhase } from './FakeUIPhase';
const { ccclass, property } = _decorator;

class InputAssemblerData {
    quadIB: gfx.Buffer|null = null;
    quadVB: gfx.Buffer|null = null;
    quadIA: gfx.InputAssembler|null = null;
}

class BloomRenderData {
    gbufferRenderPass: gfx.RenderPass | null = null;
    gbufferFrameBuffer: gfx.Framebuffer | null = null;
    gbufferRenderTargets: gfx.Texture[] = [];

    bloomRenderPass: gfx.RenderPass | null = null;
    bloomFrameBuffer: gfx.Framebuffer | null = null;
    bloomRenderTargets: gfx.Texture[] = [];

    bloomRenderPass2: gfx.RenderPass | null = null;
    bloomFrameBuffer2: gfx.Framebuffer | null = null;
    bloomRenderTargets2: gfx.Texture[] = [];

    depthTex: gfx.Texture | null = null;
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

@ccclass('Bloom')
export class Bloom extends Component {

    @property(Material)
    bloomThressholdMat: Material | null = null;

    @property(Material)
    bloomBlurMat: Material | null = null;

    @property(Material)
    bloomMergeMat: Material | null = null;

    private _bloomData: BloomRenderData | null = null;
    private originWins: any[] = [];
    private _lastUsedRenderArea: gfx.Rect | null = null;
    private _quadIB: gfx.Buffer | null = null;
    private _quadVBOnscreen: gfx.Buffer | null = null;
    private _quadVBOffscreen: gfx.Buffer | null = null;
    private _quadIAOnscreen: gfx.InputAssembler | null = null;
    private _quadIAOffscreen: gfx.InputAssembler | null = null;

    public get bloomData (): BloomRenderData {
        return this._bloomData!;
    }

    public get quadIAOnscreen (): gfx.InputAssembler {
        return this._quadIAOnscreen!;
    }

    public get quadIAOffscreen (): gfx.InputAssembler {
        return this._quadIAOffscreen!;
    }

    start () {
        this.hackPipelineRender();
        this.addCustomRendererStage();
    }

    hackPipelineRender() {
        const pl = Director.instance.root?.pipeline;
        if (null == pl) {
            return;
        }
        this.generateIA(pl.device);
        const originRender = pl.render;
        const self = this;
        this._bloomData = self.generateBloomFrameBufferData(pl);
        // pl.render = function(cameras: renderer.scene.Camera[]) {
        //     for (const c of cameras) {
        //         if (Camera.ProjectionType.ORTHO == c.projectionType) {
        //             continue;
        //         }
        //         self.updateQuadVertexData(pl.device, pl.generateRenderArea(c));
        //         self.originWins.push(c.window);
        //         if (self.bloomData) {
        //             c.window = {
        //                 framebuffer: self.bloomData.gbufferFrameBuffer
        //             }
        //         }
        //     }

        //     originRender.call(pl, cameras);

        //     for (const c of cameras) {
        //         if (Camera.ProjectionType.ORTHO == c.projectionType) {
        //             continue;
        //         }
        //         c.window = self.originWins.shift();
        //     }
        // }
    }

    addCustomRendererStage() {
        const pl = Director.instance.root?.pipeline;
        if (null == pl) {
            return;
        }
        if (!(pl instanceof ForwardPipeline)) {
            return;
        }
        const fpl = pl as ForwardPipeline;
        let flows = pl.flows;
        if (null == flows) {
            console.log("ERROR! can't find pileline flows");
            return;
        }
        const self = this;

        const sampler = renderer.samplerLib.getSampler(pl.device, samplerHash);

        for (let flow of flows) {
            if (flow instanceof ForwardFlow) {
                const ff = flow as ForwardFlow;

                for (let stage of ff.stages) {
                    if (stage instanceof ForwardStage) {
                        const originRender = stage.render;

                        stage.render = function(camera: renderer.scene.Camera) {
                            const originWin = camera.window;
                            if (self.bloomData) {
                                camera.window = {
                                    framebuffer: self.bloomData.gbufferFrameBuffer
                                }
                            }

                            originRender.call(stage, camera);

                            camera.window = originWin;
                        }

                        break;
                    }
                }

                const sampler = renderer.samplerLib.getSampler(pl.device, samplerHash);

                let bs: BloomBaseStage = new BloomThresholdStage();
                bs.bloomMat = this.bloomThressholdMat;
                bs.bloom = this;
                bs.framebuffer = null; // this.bloomData.bloomFrameBuffer;
                bs.activate(fpl, ff);
                // bs.texture1 = this.bloomData.gbufferFrameBuffer!.colorTextures[0]!;
                // bs.textureSample = sampler;
                ff.stages.push(bs);

                // bs = new BloomBlurStage();
                // bs.bloomMat = this.bloomBlurMat;
                // bs.bloom = this;
                // bs.framebuffer = this.bloomData.bloomFrameBuffer2;
                // bs.activate(fpl, ff);
                // bs.texture1 = this.bloomData.bloomFrameBuffer!.colorTextures[0]!;
                // bs.textureSample = sampler;
                // ff.stages.push(bs);

                // bs = new BloomMergeStage();
                // bs.bloomMat = this.bloomMergeMat;
                // bs.bloom = this;
                // bs.framebuffer = null;
                // bs.activate(fpl, ff);
                // bs.texture1 = this.bloomData.bloomFrameBuffer2!.colorTextures[0]!;
                // bs.texture2 = this.bloomData.gbufferFrameBuffer!.colorTextures[0]!;
                // bs.textureSample = sampler;
                // ff.stages.push(bs);

                break;
            }
        }
    }

    private generateIA(device: gfx.Device) {
        let inputAssemblerDataOffscreen = this.createQuadInputAssembler(device, gfx.SurfaceTransform.IDENTITY);
        if (!inputAssemblerDataOffscreen.quadIB || !inputAssemblerDataOffscreen.quadVB || !inputAssemblerDataOffscreen.quadIA) {
            return false;
        }
        this._quadIB = inputAssemblerDataOffscreen.quadIB;
        this._quadVBOffscreen = inputAssemblerDataOffscreen.quadVB;
        this._quadIAOffscreen = inputAssemblerDataOffscreen.quadIA;

        const inputAssemblerDataOnscreen = this.createQuadInputAssembler(device, device.surfaceTransform);
        if (!inputAssemblerDataOnscreen.quadIB || !inputAssemblerDataOnscreen.quadVB || !inputAssemblerDataOnscreen.quadIA) {
            return false;
        }
        this._quadVBOnscreen = inputAssemblerDataOnscreen.quadVB;
        this._quadIAOnscreen = inputAssemblerDataOnscreen.quadIA;
    }

    private generateBloomFrameBufferData (pl: RenderPipeline): BloomRenderData | null {
        const device = pl.device;
        if (null == device) {
            return null;
        }
        const width = device.width;
        const height = device.height;
        let bloomData = this.bloomData;
        if (bloomData) { return bloomData; }
        if (null == bloomData) {
            bloomData = new BloomRenderData();
        }

        if (null == bloomData.gbufferRenderPass) {
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
            bloomData.gbufferRenderPass = device.createRenderPass(renderPassInfo);
        }

        if (null == bloomData.bloomRenderPass) {
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
            bloomData.bloomRenderPass = device.createRenderPass(renderPassInfo);
        }

        if (null == bloomData.bloomRenderPass2) {
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
            bloomData.bloomRenderPass2 = device.createRenderPass(renderPassInfo);
        }

        bloomData.gbufferRenderTargets.push(device.createTexture(new gfx.TextureInfo(
            gfx.TextureType.TEX2D,
            gfx.TextureUsageBit.COLOR_ATTACHMENT | gfx.TextureUsageBit.SAMPLED,
            gfx.Format.RGBA16F,
            width,
            height,
        )));

        bloomData.depthTex = device.createTexture(new gfx.TextureInfo(
            gfx.TextureType.TEX2D,
            gfx.TextureUsageBit.DEPTH_STENCIL_ATTACHMENT,
            device.depthStencilFormat,
            width,
            height,
        ));

        bloomData.gbufferFrameBuffer = device.createFramebuffer(new gfx.FramebufferInfo(
            bloomData.gbufferRenderPass!,
            bloomData.gbufferRenderTargets,
            bloomData.depthTex,
        ));

        bloomData.bloomRenderTargets.push(device.createTexture(new gfx.TextureInfo(
            gfx.TextureType.TEX2D,
            gfx.TextureUsageBit.COLOR_ATTACHMENT | gfx.TextureUsageBit.SAMPLED,
            gfx.Format.RGBA16F,
            width,
            height,
        )));

        bloomData.bloomFrameBuffer = device.createFramebuffer(new gfx.FramebufferInfo(
            bloomData.bloomRenderPass!,
            bloomData.bloomRenderTargets,
            bloomData.depthTex,
        ));

        bloomData.bloomRenderTargets2.push(device.createTexture(new gfx.TextureInfo(
            gfx.TextureType.TEX2D,
            gfx.TextureUsageBit.COLOR_ATTACHMENT | gfx.TextureUsageBit.SAMPLED,
            gfx.Format.RGBA16F,
            width,
            height,
        )));

        bloomData.bloomFrameBuffer2 = device.createFramebuffer(new gfx.FramebufferInfo(
            bloomData.bloomRenderPass2!,
            bloomData.bloomRenderTargets2,
            bloomData.depthTex,
        ));

        const descriptorSet = pl.descriptorSet;
        descriptorSet?.bindTexture(pipeline.UNIFORM_GBUFFER_ALBEDOMAP_BINDING, bloomData.gbufferFrameBuffer.colorTextures[0]!);
        descriptorSet?.bindTexture(pipeline.UNIFORM_GBUFFER_EMISSIVEMAP_BINDING, bloomData.bloomFrameBuffer.colorTextures[0]!);
        descriptorSet?.bindTexture(pipeline.UNIFORM_LIGHTING_RESULTMAP_BINDING, bloomData.bloomFrameBuffer2.colorTextures[0]!);
        // descriptorSet?.bindTexture(pipeline.UNIFORM_GBUFFER_ALBEDOMAP_BINDING, bloomData.bloomFrameBuffer.colorTextures[0]!);

        const sampler = renderer.samplerLib.getSampler(device, samplerHash);
        descriptorSet?.bindSampler(pipeline.UNIFORM_GBUFFER_ALBEDOMAP_BINDING, sampler);
        descriptorSet?.bindSampler(pipeline.UNIFORM_GBUFFER_EMISSIVEMAP_BINDING, sampler);
        descriptorSet?.bindSampler(pipeline.UNIFORM_LIGHTING_RESULTMAP_BINDING, sampler);

        return bloomData;
    }

    protected createQuadInputAssembler (device: gfx.Device, surfaceTransform: gfx.SurfaceTransform): InputAssemblerData {
        // create vertex buffer
        const inputAssemblerData = new InputAssemblerData();

        const vbStride = Float32Array.BYTES_PER_ELEMENT * 4;
        const vbSize = vbStride * 4;

        const quadVB = device.createBuffer(new gfx.BufferInfo(
            gfx.BufferUsageBit.VERTEX | gfx.BufferUsageBit.TRANSFER_DST,
            gfx.MemoryUsageBit.HOST | gfx.MemoryUsageBit.DEVICE,
            vbSize,
            vbStride,
        ));

        if (!quadVB) {
            return inputAssemblerData;
        }

        // create index buffer
        const ibStride = Uint8Array.BYTES_PER_ELEMENT;
        const ibSize = ibStride * 6;

        const quadIB = device.createBuffer(new gfx.BufferInfo(
            gfx.BufferUsageBit.INDEX | gfx.BufferUsageBit.TRANSFER_DST,
            gfx.MemoryUsageBit.HOST | gfx.MemoryUsageBit.DEVICE,
            ibSize,
            ibStride,
        ));

        if (!quadIB) {
            return inputAssemblerData;
        }

        const indices = new Uint8Array(6);
        indices[0] = 0; indices[1] = 1; indices[2] = 2;
        indices[3] = 1; indices[4] = 3; indices[5] = 2;

        quadIB.update(indices);

        // create input assembler

        const attributes = new Array<gfx.Attribute>(2);
        attributes[0] = new gfx.Attribute('a_position', gfx.Format.RG32F);
        attributes[1] = new gfx.Attribute('a_texCoord', gfx.Format.RG32F);

        const quadIA = device.createInputAssembler(new gfx.InputAssemblerInfo(
            attributes,
            [quadVB],
            quadIB,
        ));

        inputAssemblerData.quadIB = quadIB;
        inputAssemblerData.quadVB = quadVB;
        inputAssemblerData.quadIA = quadIA;
        return inputAssemblerData;
    }

    public updateQuadVertexData (device: gfx.Device, renderArea: gfx.Rect) {
        if (this._lastUsedRenderArea === renderArea) {
            return;
        }

        this._lastUsedRenderArea = renderArea;
        const offData = this.genQuadVertexData(device, gfx.SurfaceTransform.IDENTITY, renderArea);
        this._quadVBOffscreen!.update(offData);

        const onData = this.genQuadVertexData(device, device.surfaceTransform, renderArea);
        this._quadVBOnscreen!.update(onData);
    }

    protected genQuadVertexData (device: gfx.Device, surfaceTransform: gfx.SurfaceTransform, renderArea: gfx.Rect) : Float32Array {
        const vbData = new Float32Array(4 * 4);

        const minX = renderArea.x / device.width;
        const maxX = (renderArea.x + renderArea.width) / device.width;
        let minY = renderArea.y / device.height;
        let maxY = (renderArea.y + renderArea.height) / device.height;
        if (device.capabilities.screenSpaceSignY > 0) {
            const temp = maxY;
            maxY       = minY;
            minY       = temp;
        }
        let n = 0;
        switch (surfaceTransform) {
        case (gfx.SurfaceTransform.IDENTITY):
            n = 0;
            vbData[n++] = -1.0; vbData[n++] = -1.0; vbData[n++] = minX; vbData[n++] = maxY;
            vbData[n++] = 1.0; vbData[n++] = -1.0; vbData[n++] = maxX; vbData[n++] = maxY;
            vbData[n++] = -1.0; vbData[n++] = 1.0; vbData[n++] = minX; vbData[n++] = minY;
            vbData[n++] = 1.0; vbData[n++] = 1.0; vbData[n++] = maxX; vbData[n++] = minY;
            break;
        case (gfx.SurfaceTransform.ROTATE_90):
            n = 0;
            vbData[n++] = -1.0; vbData[n++] = -1.0; vbData[n++] = maxX; vbData[n++] = maxY;
            vbData[n++] = 1.0; vbData[n++] = -1.0; vbData[n++] = maxX; vbData[n++] = minY;
            vbData[n++] = -1.0; vbData[n++] = 1.0; vbData[n++] = minX; vbData[n++] = maxY;
            vbData[n++] = 1.0; vbData[n++] = 1.0; vbData[n++] = minX; vbData[n++] = minY;
            break;
        case (gfx.SurfaceTransform.ROTATE_180):
            n = 0;
            vbData[n++] = -1.0; vbData[n++] = -1.0; vbData[n++] = minX; vbData[n++] = minY;
            vbData[n++] = 1.0; vbData[n++] = -1.0; vbData[n++] = maxX; vbData[n++] = minY;
            vbData[n++] = -1.0; vbData[n++] = 1.0; vbData[n++] = minX; vbData[n++] = maxY;
            vbData[n++] = 1.0; vbData[n++] = 1.0; vbData[n++] = maxX; vbData[n++] = maxY;
            break;
        case (gfx.SurfaceTransform.ROTATE_270):
            n = 0;
            vbData[n++] = -1.0; vbData[n++] = -1.0; vbData[n++] = minX; vbData[n++] = minY;
            vbData[n++] = 1.0; vbData[n++] = -1.0; vbData[n++] = minX; vbData[n++] = maxY;
            vbData[n++] = -1.0; vbData[n++] = 1.0; vbData[n++] = maxX; vbData[n++] = minY;
            vbData[n++] = 1.0; vbData[n++] = 1.0; vbData[n++] = maxX; vbData[n++] = maxY;
            break;
        default:
            break;
        }

        return vbData;
    }

    protected destroyQuadInputAssembler () {
        if (this._quadIB) {
            this._quadIB.destroy();
            this._quadIB = null;
        }

        if (this._quadVBOnscreen) {
            this._quadVBOnscreen.destroy();
            this._quadVBOnscreen = null;
        }

        if (this._quadVBOffscreen) {
            this._quadVBOffscreen.destroy();
            this._quadVBOffscreen = null;
        }

        if (this._quadIAOnscreen) {
            this._quadIAOnscreen.destroy();
            this._quadIAOnscreen = null;
        }

        if (this._quadIAOffscreen) {
            this._quadIAOffscreen.destroy();
            this._quadIAOffscreen = null;
        }
    }

}

