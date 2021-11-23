
import { Color, geometry, gfx, instantiate, Mat4, Material, MeshRenderer, Node, Quat, random, renderer, utils, Vec2, Vec3, _decorator } from "cc";
const { ccclass, property } = _decorator;

class DecalVertex {
    position: Vec3;
    normal: Vec3;
    uv: Vec2;

    constructor(...args: any[]) {
        this.position = Vec3.ZERO;
        this.normal = Vec3.ZERO;
        this.uv = Vec2.ZERO;
        if (args.length >= 3) {
            this.uv = args[2];
        }
        if (args.length >= 2) {
            this.normal = args[1];
        }
        if (args.length >= 1) {
            this.position = args[0];
        }
    }

    clone(): DecalVertex {
        const dv = new DecalVertex();

        dv.position = this.position.clone();
        dv.normal = this.normal.clone();
        dv.uv = this.uv.clone();

        return dv;
    }
}

@ccclass('DecalModel')
export class DecalModel {

    private meshRenderer: MeshRenderer | null = null;
    private position: Vec3 = new Vec3(0, 0, 0);
    private direction: Vec3 = new Vec3(0, 0, 0);
    private scale: Vec3 = new Vec3(0, 0, 0);

    private worldMat: Mat4 = new Mat4();
    private worldInvMat: Mat4 = new Mat4();
    private viewMat: Mat4 = new Mat4();
    private viewInvMat: Mat4 = new Mat4();
    // private projectorMatrix: Mat4 = new Mat4();
    // private projectorMatInverse: Mat4 = new Mat4();

    private decalVertexes: DecalVertex[] = [];
    private meshPositions: number[] = [];
    private meshNormals: number[] = [];
    private meshUVs: number[] = [];

    static create(decalTemplate: Node, mr: MeshRenderer, p: Vec3, d: Vec3, s: Vec3): Node | null {
        const dm = new DecalModel();
        dm.meshRenderer = mr;
        dm.position = p;
        dm.direction = d;
        dm.scale = s;
        dm.generate();

        if (0 == dm.meshPositions.length) {
            console.log('mesh position is 0');
            return null;
        }
        const n = instantiate(decalTemplate);
        n.name = "Decal";
        n.active = true;
        n.scale = s;
        // n.setWorldPosition(p.clone());
        const meshR = n.getComponent(MeshRenderer);
        meshR?.material?.setProperty('albedo', new Color(random()*255, random()*255, random()*255));

        meshR?.mesh?.reset(utils.createMesh({
            primitiveMode: gfx.PrimitiveMode.TRIANGLE_STRIP,
            positions: dm.meshPositions,
            normals: dm.meshNormals,
            uvs: dm.meshUVs,
            attributes: [
                new gfx.Attribute(gfx.AttributeName.ATTR_POSITION, gfx.Format.RGB32F),
                new gfx.Attribute(gfx.AttributeName.ATTR_NORMAL, gfx.Format.RGB32F),
                new gfx.Attribute(gfx.AttributeName.ATTR_TEX_COORD, gfx.Format.RG32F),
            ],
        }, undefined, { calculateBounds: false }));

        return n;
    }

    generate() {
        Mat4.lookAt(this.viewMat,
            Vec3.add(new Vec3(), this.position, this.direction),
            this.position,
            Vec3.UNIT_X);
        this.position.transformMat4(this.viewMat);
        Mat4.invert(this.viewInvMat, this.viewMat);

        // Mat4.perspective(this.projectorMatrix, 30, 1, 1, 2);
        // Mat4.ortho(this.projectorMatrix,
        //     -1, 1,
        //     -1, 1,
        //     -1, 1);
        // Mat4.lookAt(this.projectorMatrix, this.position, this.position.add(this.direction), Vec3.ONE);
        // Mat4.invert(this.projectorMatInverse, this.projectorMatrix);
        if (!this.meshRenderer) {
            return;
        }
        this.worldMat = this.meshRenderer.node.worldMatrix;
        const mo = this.meshRenderer.model;
        const me = this.meshRenderer.mesh;
        if (!me || !mo) {
            console.log('me or mo is null');
            return;
        }

        const vp = new Vec3();
        const vn = new Vec3();
        let vpos = 0;
        for (let i = 0; i < me.renderingSubMeshes.length; i++) {
            const pos = me.renderingSubMeshes[i].geometricInfo.positions;
            // const pos = me.readAttribute(i, gfx.AttributeName.ATTR_POSITION);
            // if (!pos) { return; }
            const normals = me.readAttribute(i, gfx.AttributeName.ATTR_NORMAL);
            if (pos.length != normals?.length) { break; }

            const idxs = me.renderingSubMeshes[i].geometricInfo.indices;
            if (idxs) {
                for (vpos = 0; vpos < idxs.length; vpos+=1) {
                    const vposIdx = idxs[vpos] * 3;
                    vp.set(pos[vposIdx], pos[vposIdx+1], pos[vposIdx+2]);
                    Vec3.transformMat4(vp, vp, mo.node.worldMatrix);
                    vn.set(normals[vposIdx], normals[vposIdx+1], normals[vposIdx+2]);

                    this.appendDecalVertex(vp.clone(), vn.clone());
                }
            } else {
                for (vpos = 0; vpos < pos.length; vpos+=3) {
                    vp.set(pos[vpos], pos[vpos + 1], pos[vpos + 2]);
                    Vec3.transformMat4(vp, vp, mo.node.worldMatrix);
                    vn.set(normals[vpos], normals[vpos + 1], normals[vpos + 2]);

                    this.appendDecalVertex(vp.clone(), vn.clone());
                }
            }
        }

        // for (let i = 0; i < this.decalVertexes.length; i++) {
        //     console.log(this.decalVertexes[i].position);
        // }

        // this.decalVertexes = this.clipGeometry(this.decalVertexes, new Vec3( 1, 0, 0 ));
        // this.decalVertexes = this.clipGeometry(this.decalVertexes, new Vec3(-1, 0, 0 ));
        // this.decalVertexes = this.clipGeometry(this.decalVertexes, new Vec3( 0, 1, 0 ));
        // this.decalVertexes = this.clipGeometry(this.decalVertexes, new Vec3( 0,-1, 0 ));
        // this.decalVertexes = this.clipGeometry(this.decalVertexes, new Vec3( 0, 0, 1 ));
        // this.decalVertexes = this.clipGeometry(this.decalVertexes, new Vec3( 0, 0,-2 ));

        this.decalVertexes = this.clipGeometrylByPlane(this.decalVertexes, new Vec3( 1, 0, 0 ), this.scale.x/2);
        this.decalVertexes = this.clipGeometrylByPlane(this.decalVertexes, new Vec3(-1, 0, 0 ), this.scale.x/2);
        this.decalVertexes = this.clipGeometrylByPlane(this.decalVertexes, new Vec3( 0, 1, 0 ), this.scale.y/2);
        this.decalVertexes = this.clipGeometrylByPlane(this.decalVertexes, new Vec3( 0,-1, 0 ), this.scale.y/2);
        this.decalVertexes = this.clipGeometrylByPlane(this.decalVertexes, new Vec3( 0, 0, 1 ), this.scale.z/2);
        this.decalVertexes = this.clipGeometrylByPlane(this.decalVertexes, new Vec3( 0, 0,-1 ), this.scale.z/2);

        if (0 == this.decalVertexes.length) {
            console.log("decal vertexes length is 0");
            return;
        }

        for ( let i = 0; i < this.decalVertexes.length; i ++ ) {

            const decalVertex = this.decalVertexes[ i ];

            // create texture coordinates (we are still in projector space)

            decalVertex.uv = new Vec2(
                0.5 + ( decalVertex.position.x / this.scale.x ),
                0.5 + ( decalVertex.position.y / this.scale.y )
            );

            // transform the vertex back to world space
            decalVertex.position.transformMat4(this.viewInvMat);
            decalVertex.position.transformMat4(this.worldInvMat);

            this.meshPositions.push( decalVertex.position.x, decalVertex.position.y, decalVertex.position.z );
			this.meshNormals.push( decalVertex.normal.x, decalVertex.normal.y, decalVertex.normal.z );
            this.meshUVs.push( decalVertex.uv.x, decalVertex.uv.y );
        }

        // console.log(`vertex length: ${this.decalVertexes.length}`);
        // for ( let i = 0; i < this.decalVertexes.length; i ++ ) {
        //     const pos = this.decalVertexes[i].position;
        //     const uv = this.decalVertexes[i].uv;
        //     console.log(`Pos: (${pos.x},${pos.y},${pos.z}) => UV: (${uv.x}, ${uv.y})`);
        // }

    }

    appendDecalVertex(v: Vec3, n: Vec3) {
        v.transformMat4(this.worldMat);
        v.transformMat4(this.viewMat);
        n.transformMat4(this.worldMat);

        this.decalVertexes.push(new DecalVertex(v, n));
    }

    clipGeometry(inDecalVer: DecalVertex[], plane: Vec3): DecalVertex[] {
        const inVertices = inDecalVer;
        const outVertices = [];
        const s = 0.5 * Math.abs(this.scale.dot(plane));

        // a single iteration clips one face,
        // which consists of three consecutive 'DecalVertex' objects

        for ( let i = 0; i < inVertices.length; i += 3 ) {
            let total = 0;
            let nV1 = new DecalVertex();
            let nV2 = new DecalVertex();
            let nV3 = new DecalVertex();
            let nV4 = new DecalVertex();

            const d1 = inVertices[ i + 0 ].position.dot( plane ) - s;
            const d2 = inVertices[ i + 1 ].position.dot( plane ) - s;
            const d3 = inVertices[ i + 2 ].position.dot( plane ) - s;

            const v1Out = d1 > 0;
            const v2Out = d2 > 0;
            const v3Out = d3 > 0;

            // calculate, how many vertices of the face lie outside of the clipping plane

            total = ( v1Out ? 1 : 0 ) + ( v2Out ? 1 : 0 ) + ( v3Out ? 1 : 0 );

            switch ( total ) {

                case 0: {

                    // the entire face lies inside of the plane, no clipping needed

                    outVertices.push( inVertices[ i ] );
                    outVertices.push( inVertices[ i + 1 ] );
                    outVertices.push( inVertices[ i + 2 ] );
                    break;

                }

                case 1: {

                    // one vertex lies outside of the plane, perform clipping

                    if ( v1Out ) {

                        nV1 = inVertices[ i + 1 ];
                        nV2 = inVertices[ i + 2 ];
                        nV3 = this.clip( inVertices[ i ], nV1, plane, s );
                        nV4 = this.clip( inVertices[ i ], nV2, plane, s );

                    }

                    if ( v2Out ) {

                        nV1 = inVertices[ i ];
                        nV2 = inVertices[ i + 2 ];
                        nV3 = this.clip( inVertices[ i + 1 ], nV1, plane, s );
                        nV4 = this.clip( inVertices[ i + 1 ], nV2, plane, s );

                        outVertices.push( nV3 );
                        outVertices.push( nV2.clone() );
                        outVertices.push( nV1.clone() );

                        outVertices.push( nV2.clone() );
                        outVertices.push( nV3.clone() );
                        outVertices.push( nV4 );
                        break;

                    }

                    if ( v3Out ) {

                        nV1 = inVertices[ i ];
                        nV2 = inVertices[ i + 1 ];
                        nV3 = this.clip( inVertices[ i + 2 ], nV1, plane, s );
                        nV4 = this.clip( inVertices[ i + 2 ], nV2, plane, s );

                    }

                    outVertices.push( nV1.clone() );
                    outVertices.push( nV2.clone() );
                    outVertices.push( nV3 );

                    outVertices.push( nV4 );
                    outVertices.push( nV3.clone() );
                    outVertices.push( nV2.clone() );

                    break;

                }

                case 2: {

                    // two vertices lies outside of the plane, perform clipping

                    if ( ! v1Out ) {

                        nV1 = inVertices[ i ].clone();
                        nV2 = this.clip( nV1, inVertices[ i + 1 ], plane, s );
                        nV3 = this.clip( nV1, inVertices[ i + 2 ], plane, s );
                        outVertices.push( nV1 );
                        outVertices.push( nV2 );
                        outVertices.push( nV3 );

                    }

                    if ( ! v2Out ) {

                        nV1 = inVertices[ i + 1 ].clone();
                        nV2 = this.clip( nV1, inVertices[ i + 2 ], plane, s );
                        nV3 = this.clip( nV1, inVertices[ i ], plane, s );
                        outVertices.push( nV1 );
                        outVertices.push( nV2 );
                        outVertices.push( nV3 );

                    }

                    if ( ! v3Out ) {

                        nV1 = inVertices[ i + 2 ].clone();
                        nV2 = this.clip( nV1, inVertices[ i ], plane, s );
                        nV3 = this.clip( nV1, inVertices[ i + 1 ], plane, s );
                        outVertices.push( nV1 );
                        outVertices.push( nV2 );
                        outVertices.push( nV3 );
                    }

                    break;

                }

                case 3: {

                    // the entire face lies outside of the plane, so let's discard the corresponding vertices

                    break;

                }

            }

        }

        return outVertices;
    }

    clip( v0: DecalVertex, v1: DecalVertex, p: Vec3, s: number): DecalVertex {
        const d0 = v0.position.dot( p ) - s;
        const d1 = v1.position.dot( p ) - s;

        const s0 = d0 / ( d0 - d1 );

        const ver = new DecalVertex(
            new Vec3(
                v0.position.x + s0 * ( v1.position.x - v0.position.x ),
                v0.position.y + s0 * ( v1.position.y - v0.position.y ),
                v0.position.z + s0 * ( v1.position.z - v0.position.z )
            ),
            new Vec3(
                v0.normal.x + s0 * ( v1.normal.x - v0.normal.x ),
                v0.normal.y + s0 * ( v1.normal.y - v0.normal.y ),
                v0.normal.z + s0 * ( v1.normal.z - v0.normal.z )
            )
        )

        return ver;
    }


    clipLineByPlane(p0: Vec3, p1: Vec3, planeN: Vec3, planeD: number): Vec3[] {
        const linePoints: Vec3[] = []

        const l0 = Vec3.subtract(new Vec3(), p1, p0);
        let l0d = Vec3.dot(planeN, l0);
        let p0d = Vec3.dot(planeN, p0);
        if (p0d < planeD && p0d + l0d < planeD) {
            // the line is fully inside of plane
            linePoints.push(p0.clone(), p1.clone());
            return linePoints;
        }
        if (p0d > planeD && p0d + l0d > planeD) {
            // the line is fully outside of plane
            return linePoints;
        }

        const t = (planeD - p0d)/l0d;
        if (t > 0) {
            // p0 inside of plane
            linePoints.push(p0.clone());
            linePoints.push(Vec3.add(new Vec3(), p0, l0.multiplyScalar(t)));
        } else {
            // p0 is outside of plane
            linePoints.push(Vec3.add(new Vec3(), p0, l0.multiplyScalar(t)));
            linePoints.push(p0.clone());
        }

        return linePoints;
    }

    clipTriangelByPlane(p0: Vec3, p1: Vec3, p2: Vec3, planeN: Vec3, planeD: number): Vec3[] {
        const d0 = Vec3.dot(p0, planeN) - planeD;
        const d1 = Vec3.dot(p1, planeN) - planeD;
        const d2 = Vec3.dot(p2, planeN) - planeD;

        let outsideCount = 0;
        outsideCount += ((d0 >= 0) ? 1 : 0);
        outsideCount += ((d1 >= 0) ? 1 : 0);
        outsideCount += ((d2 >= 0) ? 1 : 0);

        const rstPoints: Vec3[] = [];
        if (3 == outsideCount) {
            return rstPoints;
        } else if (0 == outsideCount) {
            rstPoints.push(p0.clone());
            rstPoints.push(p1.clone());
            rstPoints.push(p2.clone());
            return rstPoints;
        } else if (1 == outsideCount) {
            const tempPoints = [];
            // make sure outside point location at last location
            if (d0 > 0) {
                tempPoints.push(p1, p2, p0);
            } else if (d1 > 0) {
                tempPoints.push(p2, p0, p1);
            } else {
                tempPoints.push(p0, p1, p2);
            }

            let linePoints = this.clipLineByPlane(tempPoints[1], tempPoints[2], planeN, planeD);
            if (2 == linePoints.length) {
                rstPoints.push(tempPoints[0].clone());
                rstPoints.push(tempPoints[1].clone());
                rstPoints.push(linePoints[1]);
            }

            linePoints = this.clipLineByPlane(tempPoints[0], tempPoints[2], planeN, planeD);
            if (2 == linePoints.length) {
                rstPoints.push(rstPoints[2].clone());
                rstPoints.push(linePoints[1]);
                rstPoints.push(tempPoints[0].clone());
            }
        } else if (2 == outsideCount) {
            const tempPoints = [];
            // make sure outside point location at last location
            if (d0 < 0) {
                tempPoints.push(p0, p1, p2);
            } else if (d1 < 0) {
                tempPoints.push(p1, p2, p0);
            } else {
                tempPoints.push(p2, p0, p1);
            }

            let line0Points = this.clipLineByPlane(tempPoints[0], tempPoints[1], planeN, planeD);
            let line1Points = this.clipLineByPlane(tempPoints[0], tempPoints[2], planeN, planeD);
            if (2 == line0Points.length && 2 == line1Points.length) {
                rstPoints.push(tempPoints[0]);
                rstPoints.push(line0Points[1]);
                rstPoints.push(line1Points[1]);
            }
        } else {
            console.log('ERROR! impossible reach here');
        }

        return rstPoints;
    }

    clipGeometrylByPlane(inDecalVer: DecalVertex[], planeN: Vec3, planeD: number): DecalVertex[] {
        const inVertices = inDecalVer;
        const outVertices = [];

        for (let i = 0; i < inVertices.length; i += 3) {
            const p0Vert = inVertices[i];
            const p1Vert = inVertices[i + 1];
            const p2Vert = inVertices[i + 2];

            const verts = this.clipTriangelByPlane(
                p0Vert.position, p1Vert.position, p2Vert.position, planeN, planeD);

            if (3 == verts.length || 6 == verts.length) {
                outVertices.push(new DecalVertex(verts[0], p0Vert.normal, p0Vert.uv));
                outVertices.push(new DecalVertex(verts[1], p1Vert.normal, p1Vert.uv));
                outVertices.push(new DecalVertex(verts[2], p2Vert.normal, p2Vert.uv));
            }
            if (6 == verts.length) {
                outVertices.push(new DecalVertex(verts[3], p0Vert.normal, p0Vert.uv));
                outVertices.push(new DecalVertex(verts[4], p1Vert.normal, p1Vert.uv));
                outVertices.push(new DecalVertex(verts[5], p2Vert.normal, p2Vert.uv));
            }
        }

        return outVertices;
    }


}
