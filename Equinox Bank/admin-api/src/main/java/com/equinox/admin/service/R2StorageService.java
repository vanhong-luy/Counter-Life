package com.equinox.admin.service;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;

@Service
public class R2StorageService {

    private final S3Client s3Client;
    private final String bucketName;

    public R2StorageService(S3Client s3Client, @Qualifier("r2BucketName") String bucketName) {
        this.s3Client = s3Client;
        this.bucketName = bucketName;
    }

    public ResponseInputStream<GetObjectResponse> getFile(String fileKey) {
        GetObjectRequest request = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(fileKey)
                .build();
        return s3Client.getObject(request);
    }
}
