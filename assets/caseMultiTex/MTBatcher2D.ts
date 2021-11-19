
import { _decorator, Node, UI, Renderable2D, SpriteFrame, StencilManager, gfx, Color } from 'cc';
import { MTSprite } from './MTSprite';

export class MTBatcher2D {

    private static readonly GL_MAX_Texture = 8;
    private static isHacked = false;
    private static gInstance: MTBatcher2D = new MTBatcher2D();

    private textures: gfx.Texture[] = [];
    private samplers: gfx.Sampler[] = [];
    private textureHashs: number[] = [];
    private samplerHashs: number[] = [];
    private curIsMTSprite: boolean = false;
    private texBindingMap: Map<string, number> = new Map<string, number>();

    private getTexturesIdx(textHash: number): number {
        for (let i = 0; i < this.textureHashs.length; i++) {
            if (this.textureHashs[i] === textHash) {
                return i;
            }
        }

        return -1;
    }

    private addTexture(texture: gfx.Texture, textHash: number, maxTextureSize: number): boolean {
        if (this.textures.length >= maxTextureSize) {
            return false;
        }
        this.textures.push(texture);
        this.textureHashs.push(textHash);

        return true;
    }

    private canBatchTexture(texture: gfx.Texture, textHash: number, maxTextureSize: number): boolean {
        if (this.getTexturesIdx(textHash) >= 0) {
            return true;
        }
        if (this.addTexture(texture, textHash, maxTextureSize)) {
            return true;
        }
        return false;
    }

    private getSamplerIdx(samplerHash: number): number {
        for (let i = 0; i < this.samplerHashs.length; i++) {
            if (this.samplerHashs[i] === samplerHash) {
                return i;
            }
        }

        return -1;
    }

    private addSampler(sampler: gfx.Sampler, samplerHash: number, maxTextureSize: number): boolean {
        if (this.samplers.length >= maxTextureSize) {
            return false;
        }
        this.samplers.push(sampler);
        this.samplerHashs.push(samplerHash);

        return true;
    }

    private canBatchSampler(sampler: gfx.Sampler, samplerHash: number, maxTextureSize: number): boolean {
        if (this.getSamplerIdx(samplerHash) >= 0) {
            return true;
        }
        if (this.addSampler(sampler, samplerHash, maxTextureSize)) {
            return true;
        }
        return false;
    }

    private reset() {
        this.textures.length = 0;
        this.textureHashs.length = 0;
        this.samplers.length = 0;
        this.samplerHashs.length = 0;
    }

    public static getInstance(): MTBatcher2D {
        return MTBatcher2D.gInstance;
    }

    public setTexturesBindingMap(bm: Map<string, number>) {
        this.texBindingMap = bm;
    }

    public hackBatch2d(batcher: UI) {
        if (MTBatcher2D.isHacked) {
            return;
        }
        MTBatcher2D.isHacked = true;
        const mtBatcher = MTBatcher2D.getInstance();
        batcher.commitComp = MTBatcher2D.commitComp;
        batcher.mtBatcher = mtBatcher;

        const origin_getDescriptorSet = batcher._descriptorSetCache.getDescriptorSet;
        batcher._descriptorSetCache.getDescriptorSet = function(batch) {
            const ds = origin_getDescriptorSet.call(this, batch);
            if (batch.fromMTSprite) {
                const pass = batch.passes[0];
                for (let i = 1; i < mtBatcher.textures.length; i++) {
                    const texName = "spriteTexture" + i;
                    if (mtBatcher.texBindingMap.has(texName)) {
                        const binding = mtBatcher.texBindingMap.get(texName);
                        if (mtBatcher.textures[i]) {
                            pass.bindTexture(binding, mtBatcher.textures[i]);
                        }
                        if (mtBatcher.samplers[i]) {
                            pass.bindSampler(binding, mtBatcher.samplers[i]);
                        }
                    }
                }
            }

            return ds;
        }

        const origin_autoMergeBatches = batcher.autoMergeBatches;
        batcher.autoMergeBatches = function(renderComp?: Renderable2D) {
            const originLength = this._batches.length;
            origin_autoMergeBatches.call(this, renderComp);
            const newLength = this._batches.length;
            if (newLength === originLength) {
                return;
            }
            this._batches.get(newLength-1).fromMTSprite = (renderComp instanceof MTSprite);
        }
    }

    public static commitComp(comp: Renderable2D, frame: SpriteFrame | null, assembler: any, transform: Node | null) {
        const renderComp = comp;
        let texture;
        let samp;
        let textureHash = 0;
        let samplerHash = 0;
        if (frame) {
            texture = frame.getGFXTexture();
            samp = frame.getGFXSampler();
            textureHash = frame.getHash();
            samplerHash = frame.getSamplerHash();
        } else {
            texture = null;
            samp = null;
        }

        const renderScene = renderComp._getRenderScene();
        const mat = renderComp.getRenderMaterial(0);
        renderComp.stencilStage = StencilManager.sharedManager!.stage;

        const blendTargetHash = renderComp.blendHash;
        const depthStencilStateStage = renderComp.stencilStage;

        const mtBatcher = this.mtBatcher as any as MTBatcher2D
        const isMTSprite = comp instanceof MTSprite;

        if (this._currScene !== renderScene
            || this._currLayer !== comp.node.layer
            || this._currMaterial !== mat
            || this._currBlendTargetHash !== blendTargetHash
            || this._currDepthStencilStateStage !== depthStencilStateStage
            || this._currTransform !== transform
            || mtBatcher.curIsMTSprite !== isMTSprite
            || !mtBatcher.canBatchTexture(texture, textureHash, isMTSprite ? MTBatcher2D.GL_MAX_Texture : 1)
            || !mtBatcher.canBatchSampler(samp, samplerHash, isMTSprite ? MTBatcher2D.GL_MAX_Texture : 1)
            ) {
            this.autoMergeBatches(this._currComponent!);
            mtBatcher.reset();
            mtBatcher.addTexture(texture, textureHash);
            mtBatcher.addSampler(samp, samplerHash);
            mtBatcher.curIsMTSprite = isMTSprite;

            this._currScene = renderScene;
            this._currComponent = renderComp;
            this._currTransform = transform;
            this._currMaterial = mat!;
            this._currTexture = texture;
            this._currSampler = samp;
            this._currTextureHash = textureHash;
            this._currSamplerHash = samplerHash;
            this._currBlendTargetHash = blendTargetHash;
            this._currDepthStencilStateStage = depthStencilStateStage;
            this._currLayer = comp.node.layer;

        }

        if (isMTSprite) {
            const mtSprite = comp as MTSprite;
            mtSprite.color = new Color(mtBatcher.getTexturesIdx(textureHash));
        }
        if (assembler) {
            assembler.fillBuffers(renderComp, this);
        }
    }

}

