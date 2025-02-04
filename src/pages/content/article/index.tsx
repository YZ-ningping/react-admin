import type { IFormData } from '#/form'
import type { RootState } from '@/stores'
import type { IPagePermission, ITableOptions } from '#/public'
import type { IFormFn } from '@/components/Form/BasicForm'
import { useCallback, useEffect, useRef, useState } from 'react'
import { searchList, tableColumns } from './model'
import { message } from 'antd'
import { useTitle } from '@/hooks/useTitle'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { checkPermission } from '@/utils/permissions'
import { UpdateBtn, DeleteBtn } from '@/components/Buttons'
import { getArticlePage, deleteArticle } from '@/servers/content/article'
import BasicContent from '@/components/Content/BasicContent'
import BasicSearch from '@/components/Search/BasicSearch'
import BasicTable from '@/components/Table/BasicTable'
import BasicPagination from '@/components/Pagination/BasicPagination'

// 当前行数据
interface IRowData {
  id: string;
}

// 初始化搜索
const initSearch = {
  page: 1,
  pageSize: 20
}

function Page() {
  useTitle('文章管理')
  const navigate = useNavigate()
  const searchFormRef = useRef<IFormFn>(null)
  const [isLoading, setLoading] = useState(false)
  const [page, setPage] = useState(initSearch.page)
  const [pageSize, setPageSize] = useState(initSearch.pageSize)
  const [total, setTotal] = useState(0)
  const [tableData, setTableData] = useState<IFormData[]>([])
  const permissions = useSelector((state: RootState) => state.user.permissions)

  // 权限前缀
  const permissionPrefix = '/content/article'

  // 权限
  const pagePermission: IPagePermission = {
    page: checkPermission(`${permissionPrefix}/index`, permissions),
    create: checkPermission(`${permissionPrefix}/create`, permissions),
    update: checkPermission(`${permissionPrefix}/update`, permissions),
    delete: checkPermission(`${permissionPrefix}/delete`, permissions)
  }

  /**
   * 点击搜索
   * @param values - 表单返回数据
   */
  const onSearch = (values: IFormData) => {
    setPage(1)
    handleSearch({ page: 1, pageSize, ...values })
  }

  /**
   * 搜索提交
   * @param values - 表单返回数据
   */
  const handleSearch = useCallback(async (values: IFormData) => {
    try {
      setLoading(true)
      const { data: { data } } = await getArticlePage(values)
      const { items, total } = data
      setTotal(total)
      setTableData(items)
    } finally {
      setLoading(false)
    }
  }, [])

  // 首次进入自动加载接口数据
  useEffect(() => { 
    if (pagePermission.page) handleSearch({ ...initSearch })
  }, [handleSearch, pagePermission.page])

  /** 点击新增 */
  const onCreate = () => {
    navigate('/content/article/option')
  }

  /**
   * 点击编辑
   * @param id - 唯一值
   */
  const onUpdate = (id: string) => {
    navigate(`/content/article/option?id=${id}`)
  }

  /** 获取表格数据 */
  const getPage = () => {
    const formData = searchFormRef.current?.getFieldsValue() || {}
    const params = { ...formData, page, pageSize }
    handleSearch(params)
  }

  /**
   * 点击删除
   * @param id - 唯一值
   */
  const onDelete = async (id: string) => {
    try {
      setLoading(true)
      const { data } = await deleteArticle(id as string)
      if (data?.code === 200) {
        message.success(data?.message || '删除成功')
        getPage()
      }
    } finally {
      setLoading(false)
    }
  }

  /**
   * 处理分页
   * @param page - 当前页数
   * @param pageSize - 每页条数
   */
  const onChangePagination = (page: number, pageSize: number) => {
    setPage(page)
    setPageSize(pageSize)
    const formData = searchFormRef.current?.getFieldsValue()
    handleSearch({ ...formData, page, pageSize })
  }

  /**
   * 渲染操作
   * @param _ - 当前值
   * @param record - 当前行参数
   */
  const optionRender: ITableOptions<object> = (_, record) => (
    <>
      {
        pagePermission.update === true &&
        <UpdateBtn
          className='mr-5px'
          isLoading={isLoading}
          onClick={() => onUpdate((record as IRowData).id)}
        />
      }
      {
        pagePermission.delete === true &&
        <DeleteBtn
          className='mr-5px'
          isLoading={isLoading}
          handleDelete={() => onDelete((record as IRowData).id)}
        />
      }
    </>
  )

  return (
    <BasicContent isPermission={pagePermission.page}>
      <>
        <BasicSearch
          formRef={searchFormRef}
          list={searchList}
          data={initSearch}
          isLoading={isLoading}
          isCreate={pagePermission.create}
          onCreate={onCreate}
          handleFinish={onSearch}
        />
        
        <BasicTable
          loading={isLoading}
          columns={tableColumns(optionRender)}
          dataSource={tableData}
        />

        <BasicPagination
          disabled={isLoading}
          current={page}
          pageSize={pageSize}
          total={total}
          onChange={onChangePagination}
        />
      </>
    </BasicContent>
  )
}

export default Page