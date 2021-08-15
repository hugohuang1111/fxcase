
import { _decorator, Component, Node, Director, ForwardFlow, ForwardStage, pipeline, ForwardPipeline, Camera, renderer, RenderPipeline, gfx, Material } from 'cc';
import { BloomBlurStage } from './BloomBlurStage';
import { BloomMergeStage } from './BloomMergeStage';
import { BloomStage, BloomThresholdStage } from './BloomThresholdStage';
import { FakeUIPhase } from './FakeUIPhase';
const { ccclass, property } = _decorator;

class BloomRenderData {
    gbufferRenderPass: gfx.RenderPass | null = null;
    gbufferFrameBuffer: gfx.Framebuffer | null = null;
    gbufferRenderTargets: gfx.Texture[] = [];

    bloomRenderPass: gfx.RenderPass | null = null;
    bloomFrameBuffer: gfx.Framebuffer | null = null;
    bloomRenderTargets: gfx.Texture[] = [];

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

    private bloomData: BloomRenderData | null = null;
    private originWins: any[] = [];

    start () {
        //this.addCustomRendererStage();
        this.hackPipelineRender();
    }

    hackPipelineRender() {
        const pl = Director.instance.root?.pipeline;
        if (null == pl) {
            return;
        }
        const originRender = pl.render;
        const self = this;
        this.bloomData = self.generateBloomFrameBufferData(pl);
        pl.render = function(cameras: renderer.scene.Camera[]) {
            for (const c of cameras) {
                if (Camera.ProjectionType.ORTHO == c.projectionType) {
                    continue;
                }
                self.originWins.push(c.window);
                if (self.bloomData) {
                    c.window = {
                        framebuffer: self.bloomData.gbufferFrameBuffer
                    }
                }
            }

            originRender.call(pl, cameras);

            for (const c of cameras) {
                if (Camera.ProjectionType.ORTHO == c.projectionType) {
                    continue;
                }
                c.window = self.originWins.shift();
            }
        }
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
        for (let flow of flows) {
            if (flow instanceof ForwardFlow) {
                const ff = flow as ForwardFlow;

                let bs: any = new BloomThresholdStage();
                bs.initialize(ForwardStage.initInfo);
                bs.bloomMat = this.bloomThressholdMat;
                bs.activate(fpl, ff);
                ff.stages.push(bs);

                bs = new BloomBlurStage();
                bs.initialize(ForwardStage.initInfo);
                bs.bloomMat = this.bloomBlurMat;
                bs.activate(fpl, ff);
                ff.stages.push(bs);

                bs = new BloomMergeStage();
                bs.initialize(ForwardStage.initInfo);
                bs.bloomMat = this.bloomMergeMat;
                bs.activate(fpl, ff);
                ff.stages.push(bs);

                break;
            }
        }
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

        const descriptorSet = pl.descriptorSet;
        descriptorSet?.bindTexture(pipeline.UNIFORM_GBUFFER_ALBEDOMAP_BINDING, bloomData.gbufferFrameBuffer.colorTextures[0]!);
        // descriptorSet?.bindTexture(pipeline.UNIFORM_GBUFFER_ALBEDOMAP_BINDING, bloomData.bloomFrameBuffer.colorTextures[0]!);

        const sampler = renderer.samplerLib.getSampler(device, samplerHash);
        descriptorSet?.bindSampler(pipeline.UNIFORM_GBUFFER_ALBEDOMAP_BINDING, sampler);

        return bloomData;
    }

}

