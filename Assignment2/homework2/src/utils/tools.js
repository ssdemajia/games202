function getRotationPrecomputeL(precompute_L, rotationMatrix){
	let R = mat4Matrix2mathMatrix(rotationMatrix);  // 得反向。。
	R = math.inv(R);
	let M3x3 = computeSquareMatrix_3by3(R);
	let M5x5 = computeSquareMatrix_5by5(R);
	let M = math.identity(9, 9, 'sparse');
	for (let i = 0; i < 3; i++)
	{
		for (let j = 0; j < 3; j++)
		{
			M.set([i+1, j+1], M3x3.get([i, j]));
		}
	}
	for (let i = 0; i < 5; i++)
	{
		for (let j = 0; j < 5; j++)
		{
			M.set([i+4, j+4], M5x5.get([i, j]));
		}
	}
	let result = math.multiply(M, precompute_L);
	result = getMat3ValueFromRGB(result.toArray());
	return result;
}

function computeSquareMatrix_3by3(R){ // 计算方阵SA(-1) 3*3 
	
	// 1、pick ni - {ni}
	let n1 = [1, 0, 0, 0]; let n2 = [0, 0, 1, 0]; let n3 = [0, 1, 0, 0];

	// 2、{P(ni)} - A  A_inverse
	let sh1 = SHEval(n1[0], n1[1], n1[2], 3);
	let sh2 = SHEval(n2[0], n2[1], n2[2], 3);
	let sh3 = SHEval(n3[0], n3[1], n3[2], 3);
	let A = math.matrix([[sh1[1], sh2[1], sh3[1]], [sh1[2], sh2[2], sh3[2]], [sh1[3], sh2[3], sh3[3]]]);
	let A_inverse = math.inv(A);
	// 3、用 R 旋转 ni - {R(ni)}
	let n1_R = math.multiply(R, n1).toArray();
	let n2_R = math.multiply(R, n2).toArray();
	let n3_R = math.multiply(R, n3).toArray();

	// 4、R(ni) SH投影 - S
	// let v1 = n1_R.get([0, 0]);
	let sh1_R = SHEval(n1_R[0], n1_R[1], n1_R[2], 3);
	let sh2_R = SHEval(n2_R[0], n2_R[1], n2_R[2], 3);
	let sh3_R = SHEval(n3_R[0], n3_R[1], n3_R[2], 3);

	let S = math.matrix([[sh1_R[1], sh2_R[1], sh3_R[1]], [sh1_R[2], sh2_R[2], sh3_R[2]], [sh1_R[3], sh2_R[3], sh3_R[3]]]);
	// 5、S*A_inverse
	let M = math.multiply(S, A_inverse);
	return M;
}

function computeSquareMatrix_5by5(R){ // 计算方阵SA(-1) 5*5
	
	// 1、pick ni - {ni}
	let k = 1 / math.sqrt(2);
	let n1 = [1, 0, 0, 0]; let n2 = [0, 0, 1, 0]; let n3 = [k, k, 0, 0]; 
	let n4 = [k, 0, k, 0]; let n5 = [0, k, k, 0];

	// 2、{P(ni)} - A  A_inverse
	let sh1 = SHEval(n1[0], n1[1], n1[2], 3);
	let sh2 = SHEval(n2[0], n2[1], n2[2], 3);
	let sh3 = SHEval(n3[0], n3[1], n3[2], 3);
	let sh4 = SHEval(n4[0], n4[1], n4[2], 3);
	let sh5 = SHEval(n5[0], n5[1], n5[2], 3);

	let A = math.matrix([
		[sh1[4], sh2[4], sh3[4], sh4[4], sh5[4]], 
		[sh1[5], sh2[5], sh3[5], sh4[5], sh5[5]], 
		[sh1[6], sh2[6], sh3[6], sh4[6], sh5[6]], 
		[sh1[7], sh2[7], sh3[7], sh4[7], sh5[7]], 
		[sh1[8], sh2[8], sh3[8], sh4[8], sh5[8]]
	]);
	let A_inverse = math.inv(A);

	// 3、用 R 旋转 ni - {R(ni)}
	let n1_R = math.multiply(n1, R).toArray();
	let n2_R = math.multiply(n2, R).toArray();
	let n3_R = math.multiply(n3, R).toArray();
	let n4_R = math.multiply(n4, R).toArray();
	let n5_R = math.multiply(n5, R).toArray();

	// 4、R(ni) SH投影 - S
	let sh1_R = SHEval(n1_R[0], n1_R[1], n1_R[2], 3);
	let sh2_R = SHEval(n2_R[0], n2_R[1], n2_R[2], 3);
	let sh3_R = SHEval(n3_R[0], n3_R[1], n3_R[2], 3);
	let sh4_R = SHEval(n4_R[0], n4_R[1], n4_R[2], 3);
	let sh5_R = SHEval(n5_R[0], n5_R[1], n5_R[2], 3);

	let S = math.matrix([
		[sh1_R[4], sh2_R[4], sh3_R[4], sh4_R[4], sh5_R[4]], 
		[sh1_R[5], sh2_R[5], sh3_R[5], sh4_R[5], sh5_R[5]], 
		[sh1_R[6], sh2_R[6], sh3_R[6], sh4_R[6], sh5_R[6]], 
		[sh1_R[7], sh2_R[7], sh3_R[7], sh4_R[7], sh5_R[7]], 
		[sh1_R[8], sh2_R[8], sh3_R[8], sh4_R[8], sh5_R[8]]
	]);

	// 5、S*A_inverse
	let M = math.multiply(S, A_inverse);
	return M;
}

function mat4Matrix2mathMatrix(rotationMatrix){

	let mathMatrix = [];
	for(let i = 0; i < 4; i++){
		let r = [];
		for(let j = 0; j < 4; j++){
			r.push(rotationMatrix[i*4+j]);
		}
		mathMatrix.push(r);
	}
	return math.matrix(mathMatrix)

}

function getMat3ValueFromRGB(precomputeL){

    let colorMat3 = [];
    for(var i = 0; i<3; i++){
        colorMat3[i] = mat3.fromValues( precomputeL[0][i], precomputeL[1][i], precomputeL[2][i],
										precomputeL[3][i], precomputeL[4][i], precomputeL[5][i],
										precomputeL[6][i], precomputeL[7][i], precomputeL[8][i] ); 
	}
    return colorMat3;
}