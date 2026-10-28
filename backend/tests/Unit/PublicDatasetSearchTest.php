<?php

namespace Tests\Unit;

use App\Services\PublicDatasetSearch;
use PHPUnit\Framework\TestCase;

class PublicDatasetSearchTest extends TestCase
{
    public function test_education_queries_expand_into_related_dataset_topics(): void
    {
        $terms = (new PublicDatasetSearch)->terms('pendidikan dan sekolah');

        $this->assertContains('pendidikan', $terms);
        $this->assertContains('sekolah', $terms);
        $this->assertContains('siswa', $terms);
        $this->assertContains('guru', $terms);
        $this->assertContains('madrasah', $terms);
        $this->assertNotContains('dan', $terms);
    }

    public function test_natural_language_questions_keep_the_subject_and_location_terms(): void
    {
        $terms = (new PublicDatasetSearch)->terms('jumlah sekolah yang ada di Kabupaten Wajo');

        $this->assertContains('jumlah', $terms);
        $this->assertContains('sekolah', $terms);
        $this->assertContains('wajo', $terms);
        $this->assertNotContains('yang', $terms);
        $this->assertLessThanOrEqual(12, count($terms));
    }

    public function test_search_expansion_supports_other_public_service_topics(): void
    {
        $service = new PublicDatasetSearch;

        $this->assertContains('puskesmas', $service->terms('kesehatan'));
        $this->assertContains('populasi', $service->terms('penduduk'));
        $this->assertContains('umkm', $service->terms('ekonomi'));
    }
}
