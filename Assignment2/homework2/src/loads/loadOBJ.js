function loadOBJ(renderer, path, name, objMaterial, transform) {

	const manager = new THREE.LoadingManager();
	manager.onProgress = function (item, loaded, total) {
		console.log(item, loaded, total);
	};

	function onProgress(xhr) {
		if (xhr.lengthComputable) {
			const percentComplete = xhr.loaded / xhr.total * 100;
			console.log('model ' + Math.round(percentComplete, 2) + '% downloaded');
			if (percentComplete == 100) {
				//console.log(renderer)
			}
		}
	}
	function onError() { }

	new THREE.MTLLoader(manager)
		.setPath(path)
		.load(name + '.mtl', function (materials) {
			materials.preload();
			new THREE.OBJLoader(manager)
				.setMaterials(materials)
				.setPath(path)
				.load(name + '.obj', function (object) {
					object.traverse(function (child) {
						// console.log("load Obj:", child.isMesh == true, child);
						if (child.isMesh) {
							let geo = child.geometry;
							let mat;
							if (Array.isArray(child.material)) mat = child.material[0];
							else mat = child.material;
							console.log("load mat:", mat);
							var indices = Array.from({ length: geo.attributes.position.count }, (v, k) => k);

							let mesh = new Mesh({ name: 'aVertexPosition', array: geo.attributes.position.array },
								{ name: 'aNormalPosition', array: geo.attributes.normal.array },
								// { name: 'aTextureCoord', array: geo.attributes.uv.array },
								null,
								indices, transform);
							let colorMap = new Texture();
							if (mat.map != null) {
								colorMap.CreateImageTexture(renderer.gl, mat.map.image);
							}
							else {
								colorMap.CreateConstantTexture(renderer.gl, mat.color.toArray());
							}

							let material, shadowMaterial;
							let Translation = [transform.modelTransX, transform.modelTransY, transform.modelTransZ];
							let Scale = [transform.modelScaleX, transform.modelScaleY, transform.modelScaleZ];

							let light = renderer.lights[0].entity;
							console.log('objMaterial:', objMaterial == 'PRTMaterial')
							if (objMaterial == 'PRTMaterial') {
								material = buildPRTMaterial("./src/shaders/prtShader/prtVertex.glsl", "./src/shaders/prtShader/prtFragment.glsl");
							} 
							else if (objMaterial == 'SkyBoxMaterial')
							{
								material = buildSkyBoxMaterial("./src/shaders/skyBoxShader/SkyBoxVertex.glsl", "./src/shaders/skyBoxShader/SkyBoxFragment.glsl");
							}

							material.then((data) => {
								console.log('afet material load!', objMaterial);
								let meshRender = new MeshRender(renderer.gl, mesh, data);
								renderer.addMeshRender(meshRender);
							});
						}
					});
				}, onProgress, onError);
		});
}