import { gfx, primitives, Vec3 } from "cc";

export class VertexInfo {
    position: number[] = [];
    normal: number[] | null = null;
    color: number[] | null = null;
}

export class VerticesMgr {

    private vectexInfos: VertexInfo[] = [];
    private idxArray: number[] = [];
    private positionStep = 0;
    private normalStep = 0;
    private colorStep = 0;

    reset() {
        this.positionStep = 0;
        this.normalStep = 0;
        this.colorStep = 0;
    }

    addTriangle(pa: VertexInfo, pb: VertexInfo, pc: VertexInfo) {
        if (!this._isVertexInfoValid(pa)
            || !this._isVertexInfoValid(pb)
            || !this._isVertexInfoValid(pc)) {
                return;
        }

        this._addVertexInfo(pa);
        this._addVertexInfo(pb);
        this._addVertexInfo(pc);
    }

    addPlane(pa: VertexInfo, pb: VertexInfo, pc: VertexInfo, pd: VertexInfo) {
        this.addTriangle(pa, pb, pc);
        this.addTriangle(pc, pd, pa);
    }

    genGeometry(): primitives.IGeometry {
        const geo = {
            primitiveMode: gfx.PrimitiveMode.TRIANGLE_STRIP,
            positions: this._getComp("position"),
            colors: this._getComp("color"),
            normals: this._getComp("normal"),
            attributes: this._getAttr(),
            indices: this.idxArray,
        }

        return geo;
    }

    genGeometryLines(): primitives.IGeometry {
        const geo = this.genGeometry();

        geo.primitiveMode = gfx.PrimitiveMode.LINE_STRIP;
        const idxs = geo.indices;
        geo.indices = this._idxTri2Line(idxs);

        return geo;
    }

    _addVertexInfo(vec: VertexInfo) {
        let idx = this._vecExist(vec);
        if (idx < 0) {
            idx = this.vectexInfos.push(vec) - 1;
        }
        this.idxArray.push(idx);
    }

    _vecExist(vec: VertexInfo): number {
        for (let idx = 0; idx < this.vectexInfos.length; idx++) {
            const item = this.vectexInfos[idx];
            if (this._vertexInfoEqual(item, vec)) {
                return idx;
            }
        }

        return -1;
    }

    _vertexInfoEqual(veca: VertexInfo, vecb: VertexInfo): boolean {
        if (!this._vec3Equal(veca.position, vecb.position)) { return false; }
        if (!this._vec3Equal(veca.color, vecb.color)) { return false; }
        if (!this._vec3Equal(veca.normal, vecb.normal)) { return false; }

        return true;
    }

    _vec3Equal(va: number[]|null, vb: number[]|null): boolean {
        if (null == va && null == vb) { return true; }
        if (null == va && null != vb) { return false; }
        if (null != va && null == vb) { return false; }
        if (va?.length != vb?.length) { return false; }

        for (let i = 0; i < va!.length; i++) {
            if (Math.abs(va![i] - vb![i]) > Number.EPSILON) {
                return false;
            }
        }

        return true;
    }

    _getComp(compName: string): number[] {
        let arr: number[] = [];
        for(let vecInfo of this.vectexInfos) {
            if ("position" == compName) {
                arr.concat(vecInfo.position);
            } else if ("normal" == compName && vecInfo.normal) {
                arr.concat(vecInfo.normal);
            } else if ("color" == compName && vecInfo.color) {
                arr.concat(vecInfo.color);
            }
        }

        return arr;
    }

    _getAttr(): gfx.Attribute[] {
        let attrs: gfx.Attribute[] = [];

        if (this.positionStep) {
            attrs.push(new gfx.Attribute(gfx.AttributeName.ATTR_POSITION, gfx.Format.RGB32F));
        }
        if (this.normalStep) {
            attrs.push(new gfx.Attribute(gfx.AttributeName.ATTR_NORMAL, gfx.Format.RGB32F));
        }
        if (this.colorStep) {
            attrs.push(new gfx.Attribute(gfx.AttributeName.ATTR_COLOR, gfx.Format.RGBA32F));
        }

        return attrs;
    }

    _isVertexInfoValid(ver: VertexInfo): boolean {
        if (this.positionStep && this.positionStep != ver.position.length) {
            return false;
        }
        if (this.normalStep && this.normalStep != ver.normal?.length) {
            return false;
        }
        if (this.colorStep && this.colorStep != ver.color?.length) {
            return false;
        }
        if (0 == this.positionStep) {
            this.positionStep = ver.position.length;
        }
        if (0 == this.normalStep && ver.normal) {
            this.normalStep = ver.normal.length;
        }
        if (0 == this.colorStep && ver.color) {
            this.colorStep = ver.color.length;
        }

        return true;
    }

    _idxTri2Line(idxs: number[] | undefined): number[] | undefined {
        if (!idxs) { return idxs; }

        let newIdx: number[] = [];
        for (let i = 0; i < idxs.length; i+=3) {
            newIdx.push(idxs[i], idxs[i+1]);
            newIdx.push(idxs[i+1], idxs[i+2]);
            newIdx.push(idxs[i+2], idxs[i+3]);
        }

        return newIdx;
    }

}
